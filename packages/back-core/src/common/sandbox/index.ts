import * as crypto from 'node:crypto';

import vm from 'isolated-vm';
import iconv from 'iconv-lite';
import moment from 'moment';
import acorn from 'acorn';
import { literal } from 'sequelize';
import { LRUCache } from 'lru-cache';

import { getTraceMeta } from '../async_local_storage';
import { guardedLodash as _ } from './lodash';
import { guardedObject } from './object';
import { EvalOptions, SandboxConfig, SandboxIsolationLevel, SandboxLog, SandboxLogLevel } from './interfaces';
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
import { compileInIsolatedVm, guardCode, guardPropertyKey, KEY_GUARD_NAME, minifyCode, transformFunctionToAsync } from './compile';

export * from './interfaces';

const DEFAULT_GLOBAL_FUNCTIONS_OBJECT = '$';
const DEFAULT_LRU_MAX = 1000; // 1000 items

/**
 * Sandbox for evaluating user-provided (low-code) JavaScript snippets outside of a full
 * isolated-vm context, plus a factory for true `isolated-vm` contexts via `createContext()`.
 *
 * Consolidates the near-identical `Sandbox` implementations previously duplicated across
 * the task, admin-api, event, gateway, and persist-link components.
 */
export class Sandbox {
  private static singleton: Sandbox;

  config: SandboxConfig;
  isolate: vm.Isolate;
  globalFunctionsObject: string;
  defaultGlobals: Record<string, unknown>;
  cache: LRUCache<string, unknown>;
  workflowTemplateFunctions: Record<string | number, Record<string, unknown>>;

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

    // Create an isolation container
    this.isolate = new vm.Isolate({ memoryLimit: 128 });

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

    // Create a cache for evaluated functions
    this.cache = new LRUCache({ max: this.config.lru_max ?? DEFAULT_LRU_MAX });

    // A store for workflow template global functions
    this.workflowTemplateFunctions = {};

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
   * Create a true `isolated-vm` context bound to this sandbox's isolate.
   * @returns {SandboxContext}
   */
  createContext(): SandboxContext {
    return new SandboxContext(this);
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

    const hash = crypto.createHash('sha1').update(code).update(JSON.stringify(options)).digest('base64url');
    if (this.cache.has(hash)) {
      return this.cache.get(hash);
    }

    options.global ??= {};
    const workflowScope: { workflow: Record<string, unknown> } = { workflow: {} };
    options.global[this.globalFunctionsObject] = workflowScope;
    options.global.log = this.getSandboxLog({ ...options.meta, hash, workflowTemplateId: options.workflowTemplateId });
    options.global.console = this.getSandboxConsole({ ...options.meta, hash, workflowTemplateId: options.workflowTemplateId });

    // Add workflow template global functions to the execution context.
    const workflowTemplateId = options.workflowTemplateId || meta.workflowTemplateId;
    if (workflowTemplateId) {
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

    // Block escapes through the constructor/prototype chain and guard dynamic property keys.
    transformedCode = guardCode(transformedCode, (name, guardedCode) => {
      this.log.save('sandbox-alert', { ...meta, workflowTemplateId, code: guardedCode, message: `Access to ${name} detected` }, 'warn');
    });

    // Compile the code under the configured isolation level.
    const fn =
      this.config.isolationLevel === SandboxIsolationLevel.IsolatedVm
        ? compileInIsolatedVm(this.createContext(), transformedCode, globalContext, !!options.isAsync)
        : new Function(...Object.keys(globalContext), `return ${transformedCode}`)(...Object.values(globalContext));

    this.cache.set(hash, fn);
    return fn;
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
      this.log.save('sandbox-log', { data, meta }, 'info');
    };
  }

  /**
   * A console-like object for evaluated code that routes output to the log instead of the
   * host's stdout.
   * @param {object} meta Metadata.
   * @returns {object}
   */
  private getSandboxConsole(meta: Record<string, unknown>): Record<'log' | 'info' | 'warn' | 'error' | 'debug', (...args: unknown[]) => void> {
    const save = (level: SandboxLogLevel, args: unknown[]): void => this.log.save('sandbox-console', { data: args, meta }, level);
    return {
      log: (...args) => save('info', args),
      info: (...args) => save('info', args),
      warn: (...args) => save('warn', args),
      error: (...args) => save('error', args),
      debug: (...args) => save('debug', args),
    };
  }
}

export class SandboxContext {
  sandbox: Sandbox;
  context: vm.Context;
  jail: vm.Reference;

  constructor(sandbox: Sandbox) {
    this.sandbox = sandbox;
    this.context = sandbox.isolate.createContextSync();
    this.jail = this.context.global;
  }

  set(name: string, value: unknown): SandboxContext {
    this.jail.setSync(name, new vm.Reference(value));
    return this;
  }

  eval(code: string): any {
    return this.context.evalSync(code);
  }
}
