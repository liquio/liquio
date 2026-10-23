import * as crypto from 'node:crypto';

import iconv from 'iconv-lite';
import moment from 'moment';
import acorn from 'acorn';
import { literal } from 'sequelize';
import { LRUCache } from 'lru-cache';

import { getTraceMeta } from '../async_local_storage';
import { guardedLodash as _ } from './lodash';
import { guardedObject } from './object';
import { EvalOptions, IsolatedEngineOptions, SandboxConfig, SandboxIsolationLevel, SandboxLog, SandboxLogLevel } from './interfaces';
import {
  base64Decode,
  base64Encode,
  getMd5Hash,
  getSha256Hash,
  getSha512Hash,
  isAsyncFunctionValue,
  isErrorLike,
  randomUUID,
  toBase64,
} from './helpers';
import { guardCode, guardPropertyKey, KEY_GUARD_NAME, minifyCode, transformFunctionToAsync } from './compile';
import { IsolatedEngine } from './isolated';
import { getReadOnlyHostGlobals, readOnly } from './readonly';

export * from './interfaces';

const DEFAULT_GLOBAL_FUNCTIONS_OBJECT = '$';
const DEFAULT_LRU_MAX = 1000; // 1000 items
// Default globals passed as is on the `function` level: `global` is writable scope state by design (one object per
// workflow template), and the key guard is internal (low-code can't reference it).
const WRITABLE_FUNCTION_LEVEL_GLOBALS = ['global', KEY_GUARD_NAME];
// Host objects never exposed to the isolate: `_`, `moment` are preloaded inside the isolate, `crypto` and `iconv` are
// isolate shims (see ./isolated.ts), `Object` and the key guard are host-realm guards of the `function` isolation
// level (the isolate has its own `Object` and installs its own key guard).
const ISOLATED_EXCLUDED_GLOBALS = ['_', 'moment', 'iconv', 'crypto', 'Object', KEY_GUARD_NAME];
// Isolated engines shared by all sandboxes with the same engine options. An isolate is released only by `dispose()`
// (not by GC), so an engine per instance would leak ~7 MB for each `new Sandbox()`. Scopes of different instances
// are separated by scope key prefix and bounded by the engine scopes LRU.
const sharedIsolatedEngines = new Map<string, IsolatedEngine>();
let sandboxInstancesCounter = 0;

/**
 * Sandbox for evaluating user-provided (low-code) JavaScript snippets. By default code runs in an `isolated-vm`
 * isolate without host access, compiling with `new Function` in the host realm is opt-in (`isolationLevel`).
 *
 * Consolidates the near-identical `Sandbox` implementations previously duplicated across
 * the task, admin-api, event, gateway, and persist-link components.
 */
export class Sandbox {
  private static singleton: Sandbox;

  config: SandboxConfig;
  globalFunctionsObject: string;
  defaultGlobals: Record<string, unknown>;
  isIsolated: boolean;
  strictMode: boolean;
  isolatedEngine: IsolatedEngine | undefined;
  scopeKeyPrefix: string | undefined;
  cache: LRUCache<string, any>;
  workflowTemplateFunctions: Record<string | number, Record<string, unknown>>;
  workflowTemplateFunctionSources: Record<string | number, Record<string, string>>;
  workflowTemplateGlobals: Map<string, Record<string, unknown>>;

  /**
   * Get the singleton instance of the Sandbox.
   * @returns {Sandbox}
   */
  static getInstance(): Sandbox {
    if (!Sandbox.singleton) {
      throw new Error('Sandbox is not initialized.');
    }
    return Sandbox.singleton;
  }

  /**
   * @param {SandboxConfig} config Sandbox configuration.
   */
  constructor(config?: SandboxConfig) {
    this.config = config || {};

    // Set the global functions object, default is '$'
    this.globalFunctionsObject = this.config.globalFunctionsObject || DEFAULT_GLOBAL_FUNCTIONS_OBJECT;

    // Create a new context and import the default globals
    this.defaultGlobals = {
      _,
      iconv,
      moment,
      crypto,
      randomUUID,
      uuid: randomUUID,
      uuidv4: randomUUID,
      getMd5Hash,
      getSha256Hash,
      getSha512Hash,
      base64Decode,
      base64Encode,
      toBase64,
      // Runtime guard injected around dynamic property keys by `guardCode`; low-code may not
      // reference it directly (enforced at compile time).
      [KEY_GUARD_NAME]: guardPropertyKey,
      // Expose a guarded `Object` that blocks the reflection methods which reach the constructor
      // chain via a string argument, while keeping keys/values/assign/etc.
      Object: guardedObject,
      global: {},
      // Shadow host globals that evaluated code must not reach (they would otherwise resolve to
      // the host realm under `Function` isolation). `console` is re-injected per eval, routed to the log.
      console: undefined,
      process: undefined,
      globalThis: undefined,
      Function: undefined,
      // `Reflect.get(obj, 'constructor')` reaches the constructor chain via a string key, past the
      // AST guard; nothing in low-code needs it, so shadow it entirely.
      Reflect: undefined,
      queueMicrotask: undefined,
      navigator: undefined,
      performance: undefined,
      setInterval: undefined,
      setTimeout: undefined,
      setImmediate: undefined,
      clearInterval: undefined,
      clearTimeout: undefined,
      clearImmediate: undefined,
      fetch: undefined,
    };

    // Isolation level, code is guarded by `guardCode` on both levels:
    // - `isolated-vm` (default) - separate context in an `isolated-vm` isolate without host access;
    // - `function` - `new Function` in the host realm, NOT an isolation barrier. Opt-in only
    //   (`sandbox.isolationLevel = "function"`): it is faster and uses less memory.
    // Any other value (or none) selects the isolate, so a typo in config doesn't drop the isolation.
    // In production the `function` level is refused (falls back to the isolate) unless `allowUnsafeFunctionIsolation: true`.
    this.isIsolated = this.resolveIsIsolated();
    // Strict mode of the `function` level, see `evalFunction`.
    this.strictMode = this.config.strictMode !== false;
    if (this.isIsolated) {
      this.isolatedEngine = getSharedIsolatedEngine({
        memoryLimit: this.config.isolated?.memoryLimit,
        timeout: this.config.isolated?.timeout,
        maxScopes: this.config.isolated?.maxScopes,
      });
      this.scopeKeyPrefix = `sandbox${++sandboxInstancesCounter}:`;
    }

    // Create a cache for evaluated functions
    this.cache = new LRUCache({
      max: this.config.lru_max ?? DEFAULT_LRU_MAX,
      dispose: (value): void => this.isolatedEngine?.release(value),
    });

    // A store for workflow template global functions
    this.workflowTemplateFunctions = {};
    // A store for workflow template global functions sources (the isolate compiles them in each scope).
    this.workflowTemplateFunctionSources = {};
    // Default `global` objects of the `function` level, one per workflow template (code without template shares one),
    // so a workflow template can't read or change `global` of another one. The isolate keeps one per scope.
    this.workflowTemplateGlobals = new Map();

    Sandbox.singleton = this;
  }

  /**
   * Register a new default global for evaluated code. Fails if the name is already taken,
   * so components don't silently shadow one of the built-in helpers or each other's globals.
   * @param {string} name Global name.
   * @param {unknown} value Global value.
   * @returns {Sandbox}
   */
  addGlobal(name: string, value: unknown): Sandbox {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('Global name must be a non-empty string');
    }
    if (value === undefined) {
      throw new Error('Global value cannot be undefined');
    }
    if (this.defaultGlobals[name] !== undefined) {
      throw new Error(`Global "${name}" already exists`);
    }
    this.defaultGlobals[name] = value;
    return this;
  }

  /**
   * Load workflow template global functions from the database into the sandbox.
   * @param {object} models Sequelize models container exposing `models.workflowTemplate`.
   * @returns {Promise<void>}
   */
  async init(models: any): Promise<void> {
    if (!models?.models?.workflowTemplate) {
      this.log.save('sandbox-warning', { message: 'Models are required to initialize the sandbox.' }, 'warn');
      return;
    }

    // Select all workflow templates that have global functions defined in their data.
    const workflowTemplates = await models.models.workflowTemplate.model.findAll({
      where: literal("data::jsonb ? 'globalFunctions'"),
      attributes: ['id', 'data'],
    });

    // Iterate through each workflow template and extract global functions.
    for (const workflowTemplate of workflowTemplates) {
      const globalFunctions = workflowTemplate.data?.globalFunctions || {};

      if (typeof globalFunctions !== 'object') {
        this.log.save(
          'sandbox-warning',
          {
            workflowTemplateId: workflowTemplate.id,
            message: 'Invalid globalFunctions for workflow template, must be an object.',
            data: workflowTemplate.data,
          },
          'warn',
        );
        continue;
      }

      this.updateWorkflowTemplateFunctions(workflowTemplate.id, globalFunctions);
    }
  }

  /**
   * Compile and store the global functions of a single workflow template.
   * @param {string|number} workflowTemplateId Workflow template ID.
   * @param {object} globalFunctions Map of function name to function source code.
   */
  updateWorkflowTemplateFunctions(workflowTemplateId: string | number, globalFunctions: Record<string, unknown>): void {
    // Filter out empty strings.
    const pairs = Object.entries(globalFunctions || {}).filter(([, v]) => {
      return typeof v === 'string' && v.length > 0;
    }) as [string, string][];

    // Iterate over each global function and save it to the instance store.
    for (const [functionName, functionCode] of pairs) {
      this.workflowTemplateFunctions[workflowTemplateId] ??= {};

      if (this.isIsolated) {
        let guardedCode: string;
        try {
          guardedCode = guardCode(Sandbox.minifyCode(functionCode), (name, codeWithAccess) => {
            this.log.save('sandbox-alert', { workflowTemplateId, functionName, code: codeWithAccess, message: `Access to ${name} detected` }, 'warn');
          });
        } catch (error) {
          this.log.save('sandbox-global-function-error', { workflowTemplateId, functionName, error: error.message, code: functionCode }, 'warn');
          continue;
        }
        this.workflowTemplateFunctionSources[workflowTemplateId] ??= {};
        this.workflowTemplateFunctionSources[workflowTemplateId][functionName] = guardedCode;
        this.isolatedEngine.resetScope(this.getScopeKey(workflowTemplateId));
        this.log.save('sandbox-global-function', { workflowTemplateId, functionName }, 'info');
        continue;
      }

      try {
        this.workflowTemplateFunctions[workflowTemplateId][functionName] = this.eval(functionCode, {
          isAsync: functionCode.trim().startsWith('async'),
        });

        this.log.save(
          'sandbox-global-function',
          {
            workflowTemplateId,
            functionName,
          },
          'info',
        );
      } catch (error) {
        this.log.save(
          'sandbox-global-function-error',
          {
            workflowTemplateId,
            functionName,
            error: error instanceof Error ? error.message : String(error),
            code: functionCode,
          },
          'warn',
        );
      }
    }
  }

  /**
   * Check statically (without executing) that code is a single function or arrow function expression.
   * @param {string} code Code to check.
   * @returns {boolean} Is function literal.
   */
  static isFunctionLiteral(code: unknown): boolean {
    if (typeof code !== 'string' || code.trim().length === 0) {
      return false;
    }
    try {
      const { body } = acorn.parse(code, { ecmaVersion: 2020 });
      return (
        body.length === 1 &&
        body[0].type === 'ExpressionStatement' &&
        ['ArrowFunctionExpression', 'FunctionExpression'].includes(body[0].expression.type)
      );
    } catch {
      return false;
    }
  }

  /**
   * Get count of declared arguments of a function literal, if the function can not use other arguments
   * (no rest parameters, no `arguments`). Used to avoid copying unused arguments into the isolate.
   * @param {string} code Code.
   * @returns {number|undefined}
   */
  static getDeclaredArgsCount(code: string): number | undefined {
    try {
      const { body } = acorn.parse(code, { ecmaVersion: 'latest' });
      const expression = body.length === 1 && body[0].type === 'ExpressionStatement' && body[0].expression;
      if (!expression || (expression.type !== 'ArrowFunctionExpression' && expression.type !== 'FunctionExpression')) {
        return undefined;
      }
      if (expression.params.some((param) => param.type === 'RestElement') || /\barguments\b/.test(code)) {
        return undefined;
      }
      return expression.params.length;
    } catch {
      return undefined;
    }
  }

  /**
   * Minify code by stripping comments and whitespace.
   * @param {string} code - The code to minify.
   * @returns {string} - Minified code without comments.
   */
  static minifyCode(code: string): string {
    return minifyCode(code);
  }

  /**
   * Evaluate code within a sandbox.
   * @param {string} code Code to execute.
   * @param {EvalOptions} options
   * @returns {any} Result.
   */
  eval(code: string, options: EvalOptions = {}): any {
    const meta = getTraceMeta() || {};

    if (typeof code !== 'string' || code.length === 0) {
      return options.defaultValue;
    }

    // The compiled function is bound to its workflow template (`$.workflow`, `global`). The template may come from trace
    // meta, not only from options, so it is a part of the cache key.
    const workflowTemplateId = options.workflowTemplateId || meta.workflowTemplateId;

    // `meta` is used only for logs, so it is not a part of cache key: the same code for different documents is
    // compiled once. Logs get current trace meta at call time. Host functions in `global` are not serializable and
    // may be bound to a particular document (e.g. `getFileHash`), so then `meta` stays in the key as before.
    const cacheKeyOptions = hasFunctions(options.global) ? options : { ...options, meta: undefined };
    const hash = crypto
      .createHash('sha1')
      .update(code)
      .update(JSON.stringify(cacheKeyOptions))
      .update(String(workflowTemplateId ?? ''))
      .digest('base64url');
    if (this.cache.has(hash)) {
      return this.cache.get(hash);
    }

    options.global ??= {};
    const workflowScope: { workflow: Record<string, unknown> } = { workflow: {} };
    options.global[this.globalFunctionsObject] = workflowScope;
    options.global.log = this.getSandboxLog({ ...options.meta, hash, workflowTemplateId: options.workflowTemplateId });
    options.global.console = this.getSandboxConsole({ ...options.meta, hash, workflowTemplateId: options.workflowTemplateId });

    // Add workflow template global functions to the execution context.
    if (workflowTemplateId && !this.isIsolated) {
      workflowScope.workflow = { ...this.workflowTemplateFunctions[workflowTemplateId] };
    }

    const globalContext = { ...this.defaultGlobals, ...options.global };

    let transformedCode = Sandbox.minifyCode(code);
    if (options.isAsync) {
      const asyncFunctions = Object.entries(globalContext)
        .filter(([, value]) => isAsyncFunctionValue(value))
        .map(([key]) => key);

      transformedCode = transformFunctionToAsync(transformedCode, asyncFunctions);
    }

    const fn = this.isIsolated
      ? this.evalIsolated(transformedCode, globalContext, { isAsync: options.isAsync, workflowTemplateId, meta })
      : this.evalFunction(transformedCode, globalContext, { workflowTemplateId, meta });
    this.cache.set(hash, fn);
    return fn;
  }

  /**
   * Evaluate code with `new Function` in the host realm guarded by `guardCode`. NOT an isolation barrier.
   */
  private evalFunction(
    code: string,
    globalContext: Record<string, unknown>,
    { workflowTemplateId, meta }: { workflowTemplateId?: string | number; meta: Record<string, unknown> },
  ): any {
    // Block escapes through the constructor/prototype chain and guard dynamic property keys.
    const guardedCode = guardCode(code, (name, codeWithAccess) => {
      this.log.save('sandbox-alert', { ...meta, workflowTemplateId, code: codeWithAccess, message: `Access to ${name} detected` }, 'warn');
    });

    // Every host global name is a parameter bound to a read-only view (or `undefined`), and default globals are
    // read-only views too, so evaluated code can't change built-ins or helpers shared with the host and other code.
    // Globals passed by the caller (`options.global`) are passed as is.
    const scope: Record<string, unknown> = { ...getReadOnlyHostGlobals() };
    for (const [key, value] of Object.entries(globalContext)) {
      const isDefaultGlobal = this.defaultGlobals[key] === value && !WRITABLE_FUNCTION_LEVEL_GLOBALS.includes(key);
      scope[key] = isDefaultGlobal ? readOnly(value) : value;
    }
    if (scope.global === this.defaultGlobals.global) {
      scope.global = this.getWorkflowTemplateGlobal(workflowTemplateId);
    }

    // Strict mode (`strictMode`, on by default): a function called without a receiver gets `this === undefined` instead
    // of the host global object (also in V8 stack trace callsites), and assignment to an undeclared name throws instead
    // of creating a host global. Without it, `(function () { return this })()` reaches the host `process`.
    const directive = this.strictMode ? '"use strict"; ' : '';
    return new Function(...Object.keys(scope), `${directive}return ${guardedCode}`)(...Object.values(scope));
  }

  /**
   * Get the default `global` object of a workflow template for the `function` level.
   * @param {number|string} [workflowTemplateId] Workflow template ID.
   * @returns {object}
   */
  private getWorkflowTemplateGlobal(workflowTemplateId?: string | number): Record<string, unknown> {
    const key = workflowTemplateId ? String(workflowTemplateId) : '';
    if (!this.workflowTemplateGlobals.has(key)) {
      this.workflowTemplateGlobals.set(key, {});
    }
    return this.workflowTemplateGlobals.get(key);
  }

  /**
   * Evaluate code in an `isolated-vm` isolate (`isolationLevel = "isolated-vm"`).
   */
  private evalIsolated(
    code: string,
    globalContext: Record<string, unknown>,
    { isAsync, workflowTemplateId, meta }: { isAsync?: boolean; workflowTemplateId?: string | number; meta: Record<string, unknown> },
  ): any {
    // Block escapes through the constructor/prototype chain and guard dynamic property keys.
    const guardedCode = guardCode(code, (name, codeWithAccess) => {
      this.log.save('sandbox-alert', { ...meta, workflowTemplateId, code: codeWithAccess, message: `Access to ${name} detected` }, 'warn');
    });
    const globals = Object.fromEntries(
      Object.entries(globalContext).filter(
        ([key, value]) =>
          value !== undefined &&
          key !== this.globalFunctionsObject &&
          !ISOLATED_EXCLUDED_GLOBALS.includes(key) &&
          // Default `global` object is shared by all code of the scope (as the host object on the `function` level).
          !(key === 'global' && value === this.defaultGlobals.global),
      ),
    );
    return this.isolatedEngine.compile(guardedCode, {
      scopeKey: this.getScopeKey(workflowTemplateId),
      scopeGlobals: Object.fromEntries(
        Object.entries(this.defaultGlobals).filter(([key, value]) => value !== undefined && !ISOLATED_EXCLUDED_GLOBALS.includes(key)),
      ),
      globals,
      globalFunctions: (workflowTemplateId && this.workflowTemplateFunctionSources[workflowTemplateId]) || {},
      globalFunctionsObject: this.globalFunctionsObject,
      hiddenGlobals: Object.keys(globalContext).filter((key) => globalContext[key] === undefined),
      maxArgs: Sandbox.getDeclaredArgsCount(code),
      isAsync,
      onSetupError: (functionName, error) =>
        this.log.save(
          'sandbox-global-function-error',
          {
            ...meta,
            workflowTemplateId,
            functionName,
            error: error.message,
          },
          'warn',
        ),
      onDefineClassError: (name, error) =>
        this.log.save('sandbox-define-class-error', { ...meta, workflowTemplateId, name, error: error?.message }, 'warn'),
    });
  }

  /**
   * Get isolate scope key: one scope per workflow template, code without template shares default scope.
   * Prefixed with the sandbox instance, as the engine is shared between instances.
   * @param {number|string} [workflowTemplateId] Workflow template ID.
   * @returns {string}
   */
  private getScopeKey(workflowTemplateId?: string | number): string {
    return this.scopeKeyPrefix + (workflowTemplateId ? `workflowTemplate:${workflowTemplateId}` : 'default');
  }

  /**
   * Evaluate and run code with arguments within a sandbox.
   * @param {string} code Code to execute.
   * @param {any[]} args Arguments.
   * @param {EvalOptions} options Additional evaluation options.
   * @returns {any} Result.
   */
  evalWithArgs(code: string | undefined, args?: any[], options: EvalOptions = {}): any {
    const meta = options.meta ?? {};

    if (code === undefined && 'defaultValue' in options) {
      return options.defaultValue;
    } else if (code === undefined && options.throwOnUndefined) {
      throw this.throwError(new Error('Code is undefined'), code, meta);
    } else if (code === undefined) {
      return undefined;
    }

    // Copy workflowTemplateId to meta if it exists in options.
    if (options.workflowTemplateId && !meta.workflowTemplateId) {
      meta.workflowTemplateId = options.workflowTemplateId;
    }

    try {
      const time = Date.now();

      // Temporary fix for old low code snippets.
      if (options.isAsync && code.trim().startsWith('(') && !code.trim().startsWith('async') && /\bawait\b/.test(code)) {
        code = `async ${code}`;
      }

      let isArrowFunction: boolean | undefined;
      let arrowParams: Array<string | undefined> | undefined;
      let acornError: unknown;
      try {
        const [firstStatement] = acorn.parse(code, { ecmaVersion: 2020 }).body;
        if (firstStatement?.type === 'ExpressionStatement' && firstStatement.expression.type === 'ArrowFunctionExpression') {
          isArrowFunction = true;
          arrowParams = firstStatement.expression.params.map((param) => ('name' in param ? param.name : undefined));
          if (isArrowFunction && Array.isArray(arrowParams) && args) {
            args = args.slice(0, arrowParams.length);
          }
        }
      } catch (error) {
        acornError = error;
      }

      if (options.checkArrow && !isArrowFunction) {
        return code;
      } else if (acornError) {
        throw acornError;
      }

      const fn = this.eval(code, options);

      if (typeof fn !== 'function') {
        if (!options.checkArrow) {
          this.log.save('sandbox-warning', { ...meta, error: 'Function not found', acornError, code }, 'warn');
        }
        return fn;
      }

      if (this.config.logging) {
        const result = fn(...(args || []));
        this.log.save('sandbox-eval', { ...meta, isArrowFunction, arrowParams, duration: Date.now() - time });
        return result;
      } else {
        return fn(...(args || []));
      }
    } catch (error) {
      throw this.throwError(error, code, meta);
    }
  }

  throwError(error: unknown, code: string | undefined, meta: Record<string, unknown>): Error {
    // Duck-type rather than `instanceof Error`: an error thrown inside an `isolated-vm` isolate
    // crosses back as an object shaped like an Error, but isn't recognized by the host's own
    // Error constructor since it belongs to a different V8 realm.
    const errorLike = isErrorLike(error) ? error : undefined;
    const message = errorLike?.message ?? String(error);
    const loc = errorLike?.loc;

    this.log.save('sandbox-error', { ...meta, error: message, code }, 'error');

    let errorMessage = `Sandbox error: "${message}"`;
    if (meta.fn) {
      errorMessage += ` in ${String(meta.fn)}`;
    }
    if (meta.caller) {
      errorMessage += ` called by ${String(meta.caller)}`;
    }

    if (loc && typeof code === 'string') {
      const excerpt = code.split('\n')[loc.line - 1];
      errorMessage += `\n  ${excerpt}\n  ${' '.repeat(loc.column)}^`;
    }

    return new Error(errorMessage);
  }

  /**
   * Decide whether to use the isolate. `function` level is host-realm execution: in production (NODE_ENV `production`
   * or `prod`) it is refused with an error log unless `allowUnsafeFunctionIsolation` is `true`; elsewhere it only warns.
   * @returns {boolean} True if the isolate is used.
   */
  private resolveIsIsolated(): boolean {
    if (this.config.isolationLevel !== SandboxIsolationLevel.Function) {
      return true;
    }
    const isProduction = ['production', 'prod'].includes(
      String(process.env.NODE_ENV ?? '')
        .trim()
        .toLowerCase(),
    );
    const allowed = this.config.allowUnsafeFunctionIsolation === true;
    const refuse = isProduction && !allowed;
    const message = refuse
      ? 'sandbox.isolationLevel "function" runs code in the host realm and is refused in production, using "isolated-vm"'
      : 'sandbox.isolationLevel "function" runs code in the host realm and is not an isolation barrier';
    try {
      this.log.save('sandbox-unsafe-function-level', { message, isProduction, allowUnsafeFunctionIsolation: allowed }, refuse ? 'error' : 'warn');
    } catch {
      // The logger may not be set up yet; never fail sandbox creation because of it.
    }
    return refuse;
  }

  /**
   * The logger to use, defaulting to `global.log` for backwards compatibility with components
   * that set it up as a process-wide singleton.
   */
  private get log(): SandboxLog {
    if (this.config.getLog) {
      return this.config.getLog();
    }
    return (global as unknown as { log: SandboxLog }).log;
  }

  private getSandboxLog(meta: Record<string, unknown>): (data: unknown) => void {
    return (data: unknown) => {
      this.log.save('sandbox-log', { data, meta, trace: getTraceMeta() }, 'info');
    };
  }

  /**
   * A console-like object for evaluated code that routes output to the log instead of the
   * host's stdout.
   * @param {object} meta Metadata.
   * @returns {object}
   */
  private getSandboxConsole(meta: Record<string, unknown>): Record<'log' | 'info' | 'warn' | 'error' | 'debug', (...args: unknown[]) => void> {
    const save = (level: SandboxLogLevel, args: unknown[]): void =>
      this.log.save('sandbox-console', { data: args, meta, trace: getTraceMeta() }, level);
    return {
      log: (...args) => save('info', args),
      info: (...args) => save('info', args),
      warn: (...args) => save('warn', args),
      error: (...args) => save('error', args),
      debug: (...args) => save('debug', args),
    };
  }
}

/**
 * Has object (or nested plain objects) function values.
 * @param {object} [object] Object.
 * @param {number} [depth] Depth.
 * @returns {boolean}
 */
function hasFunctions(object: unknown, depth: number = 0): boolean {
  if (!object || typeof object !== 'object' || depth > 5) {
    return false;
  }
  return Object.values(object).some((value) => typeof value === 'function' || hasFunctions(value, depth + 1));
}

/**
 * Get isolated engine shared by sandboxes with the same options.
 * @param {IsolatedEngineOptions} options Engine options.
 * @returns {IsolatedEngine}
 */
function getSharedIsolatedEngine(options: IsolatedEngineOptions): IsolatedEngine {
  const key = JSON.stringify([options.memoryLimit, options.timeout, options.maxScopes]);
  if (!sharedIsolatedEngines.has(key)) {
    sharedIsolatedEngines.set(key, new IsolatedEngine(options));
  }
  return sharedIsolatedEngines.get(key);
}
