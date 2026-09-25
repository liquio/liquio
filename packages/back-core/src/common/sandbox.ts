import vm from 'isolated-vm';
import iconv from 'iconv-lite';
import moment from 'moment';
import _ from 'lodash';
import * as crypto from 'node:crypto';
import acorn from 'acorn';
import { literal } from 'sequelize';
import { LRUCache } from 'lru-cache';

import { getTraceMeta } from './async_local_storage';

const { randomUUID } = crypto;

const DEFAULT_GLOBAL_FUNCTIONS_OBJECT = '$';
const DEFAULT_LRU_MAX = 1000; // 1000 items

/** Marks a host wrapper function (built by `compileInIsolatedVm` for async code) as
 * promise-returning, so nesting it as a global into another isolate — as happens when a
 * compiled workflow template function is exposed under `$.workflow` — bridges it correctly
 * even though the wrapper itself isn't declared `async`. */
const ASYNC_BRIDGE_MARKER = Symbol('isolatedVmAsyncBridge');

/** A host wrapper function produced by `compileInIsolatedVm` for async code, tagged with
 * `ASYNC_BRIDGE_MARKER` so it can be recognized as promise-returning when nested as a global
 * into another isolate. */
interface AsyncBridgeFunction {
  (...args: unknown[]): Promise<unknown>;
  [ASYNC_BRIDGE_MARKER]?: true;
}

/**
 * Whether a function value is (or behaves like) an `AsyncFunction`. TypeScript targets at or
 * below ES2016 (this repo builds at ES6) downlevel `async`/`await` into a plain function
 * wrapping a generator via the `__awaiter` helper, which loses the native `AsyncFunction`
 * constructor — so a TypeScript-authored async global doesn't pass a bare `constructor.name`
 * check. Detect that shape from its source text as a fallback, alongside `ASYNC_BRIDGE_MARKER`.
 * @param {unknown} value Value to check.
 * @returns {boolean}
 */
function isAsyncFunctionValue(value: unknown): boolean {
  if (typeof value !== 'function') return false;
  if (value.constructor?.name === 'AsyncFunction') return true;
  if ((value as AsyncBridgeFunction)[ASYNC_BRIDGE_MARKER] === true) return true;
  return /\b__awaiter\(/.test(Function.prototype.toString.call(value));
}

/** Structural shape of a thrown value that looks like an `Error` (has a string `.message`,
 * and optionally a parser-style `.loc`), without requiring `instanceof Error` — a real `Error`
 * thrown inside an `isolated-vm` isolate crosses back as an object of this shape but belongs to
 * a different V8 realm, so `instanceof` against the host's own `Error` constructor fails.
 * @param {unknown} error Value to check.
 * @returns {boolean}
 */
function isErrorLike(error: unknown): error is { message: string; loc?: { line: number; column: number } } {
  return typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string';
}

/** Sandbox globals that can't be safely bridged into an `isolated-vm` isolate: they are rich
 * library namespaces (native bindings, or objects whose methods return further class instances
 * that lose their prototype once copied across the isolation boundary), rather than plain
 * functions operating on cloneable data. They remain available under the default `function`
 * isolation level. */
const ISOLATED_VM_UNSUPPORTED_GLOBALS = new Set(['_', 'iconv', 'moment', 'crypto']);

/** Property names that let low-code climb the prototype/constructor chain back to the real
 * `Function` constructor (and through it to the host realm), or mutate shared built-in prototypes.
 * Reaching any of these from sandboxed code is treated as an escape attempt and blocked. */
const FORBIDDEN_PROPERTIES = new Set(['constructor', '__proto__', 'prototype']);

/** Name of the internal runtime helper injected around dynamic (non-statically-resolvable) property
 * keys. Low-code is forbidden from referencing it so it can't be shadowed to defeat the guard. */
const KEY_GUARD_NAME = '__sbKey';

/**
 * Runtime guard for a dynamically-computed property key. Coerces the key to a primitive exactly
 * once and returns that coerced value, so the subsequent member access uses the already-checked
 * key rather than re-coercing an attacker-controlled object (which would otherwise allow a
 * time-of-check/time-of-use bypass via a `toString` that returns different values). Throws if the
 * key resolves to one of the forbidden escape-chain properties.
 * @param {unknown} key Raw computed key.
 * @returns {string | symbol} The validated key to use for the access.
 */
function guardPropertyKey(key: unknown): string | symbol {
  if (typeof key === 'symbol') {
    return key;
  }
  const resolved = String(key);
  if (FORBIDDEN_PROPERTIES.has(resolved)) {
    throw new Error(`Access to "${resolved}" is blocked`);
  }
  return resolved;
}

/** Minimal structural shape of the acorn AST nodes the sandbox guard inspects. */
interface AstNode {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

/**
 * Resolve an AST node to a constant string when it can be determined statically (string/number/
 * boolean/null literals, expression-free template literals, and `+` concatenations of those).
 * Returns `null` for anything whose value is only known at runtime.
 * @param {AstNode | undefined} node AST node in key position.
 * @returns {string | null}
 */
function resolveStaticString(node: AstNode | undefined): string | null {
  if (!node) return null;
  if (node.type === 'Literal') {
    const value = (node as { value?: unknown }).value;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean' || value === null) return String(value);
    return null;
  }
  if (node.type === 'TemplateLiteral') {
    const { expressions, quasis } = node as unknown as { expressions: unknown[]; quasis: { value: { cooked: string } }[] };
    if (expressions.length === 0) return quasis.map((q) => q.value.cooked).join('');
    return null;
  }
  if (node.type === 'BinaryExpression' && (node as { operator?: string }).operator === '+') {
    const left = resolveStaticString((node as { left?: AstNode }).left);
    const right = resolveStaticString((node as { right?: AstNode }).right);
    if (left !== null && right !== null) return left + right;
  }
  return null;
}

/**
 * Depth-first walk over an acorn AST, invoking `visit` on every node.
 * @param {AstNode | undefined | null} node Root node.
 * @param {(node: AstNode) => void} visit Visitor.
 */
function walkAst(node: AstNode | undefined | null, visit: (node: AstNode) => void): void {
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue;
    const child = (node as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof (item as AstNode).type === 'string') walkAst(item as AstNode, visit);
      }
    } else if (child && typeof (child as AstNode).type === 'string') {
      walkAst(child as AstNode, visit);
    }
  }
}

/**
 * How evaluated code is isolated from the host process.
 */
export enum SandboxIsolationLevel {
  /** Compiled with `new Function(...)`. Fast, and gives every default global (including rich
   * libraries like `_`/`moment`) full fidelity, but code runs in the same V8 realm as the host
   * — it can reach and mutate the host's global object. This is the default. */
  Function = 'function',
  /** Compiled and run inside a real V8 isolate (via `SandboxContext`). Code cannot touch the
   * host realm at all, but only plain functions and JSON-safe data can cross the isolation
   * boundary, so `_`, `iconv`, `moment` and `crypto` are not available. */
  IsolatedVm = 'isolated-vm',
}

/** Log levels used by `Sandbox`'s own diagnostic `save()` calls. */
export type SandboxLogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Minimal structural shape for the log object each component exposes on `global.log`.
 * Consumers may instead pass a `getLog` function in the sandbox config to avoid
 * depending on a process-wide global.
 */
export interface SandboxLog {
  save(event: string, data: Record<string, unknown>, level?: SandboxLogLevel): void;
}

export interface SandboxConfig {
  /** Name of the object that exposes workflow template global functions inside evaluated code. Default: '$'. */
  globalFunctionsObject?: string;
  /** Max number of compiled functions to keep in the eval cache. Default: 1000. */
  lru_max?: number;
  /** Log every eval/evalWithArgs call (in addition to warnings/errors, which are always logged). */
  logging?: boolean;
  /** Returns the logger to use. Defaults to reading `global.log`. */
  getLog?: () => SandboxLog;
  /** How evaluated code is isolated from the host process. Default: `SandboxIsolationLevel.Function`. */
  isolationLevel?: SandboxIsolationLevel;
  [key: string]: unknown;
}

export interface EvalOptions {
  /** Extra globals to expose to the evaluated code, merged over the sandbox defaults. */
  global?: Record<string, unknown>;
  /** Evaluate code as an async function, awaiting any async globals it calls. */
  isAsync?: boolean;
  /** Throw an error if code is undefined. */
  throwOnUndefined?: boolean;
  /** Check for arrow functions; return the raw code string if it isn't one. */
  checkArrow?: boolean;
  /** Workflow template ID whose global functions should be exposed as `$.workflow`. */
  workflowTemplateId?: string | number;
  /** Default value to return if code is empty/undefined. */
  defaultValue?: unknown;
  /** Meta data for logging. */
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

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
      global: {},
      // Shadow host globals that evaluated code must not reach (they would otherwise resolve to
      // the host realm under `Function` isolation). `console` is re-injected per eval, routed to the log.
      console: undefined,
      process: undefined,
      globalThis: undefined,
      Function: undefined,
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
    return code
      .replace(/^\s*\/\/.*$/gm, '') // Remove single-line comments starting from the line beginning
      .replace(/^\s*\/\*[\s\S]*?\*\//gm, '') // Remove multi-line comments starting from the line beginning
      .trim();
  }

  /**
   * Harden code against prototype/constructor-chain escapes before it is compiled. Parses the code
   * and (1) rejects any access to `constructor`, `prototype` or `__proto__` — whether via dot
   * notation, a statically-resolvable computed key (string/template/concatenation literal), or the
   * `__proto__` object-literal setter — and (2) rewrites every remaining *dynamic* computed key
   * `obj[expr]` to `obj[__sbKey(expr)]`, so a key that only resolves to a forbidden name at runtime
   * is caught by `guardPropertyKey`. Ordinary dynamic indexing (`arr[i]`, `obj[key]`), method calls
   * and assignments through dynamic keys keep working. Low-code referencing the reserved
   * `__sbKey` identifier is rejected so the guard cannot be shadowed.
   *
   * If the code cannot be parsed (rare — it would also fail to compile), it falls back to a
   * conservative token check so an unparseable payload still can't smuggle the forbidden names.
   * @param {string} code Minified (and, if async, already transformed) code.
   * @param {Record<string, unknown>} meta Logging metadata.
   * @returns {string} The hardened code to compile.
   */
  private guardCode(code: string, meta: Record<string, unknown>): string {
    const forbid = (name: string): never => {
      this.log.save('sandbox-alert', { ...meta, code, message: `Access to ${name} detected` }, 'warn');
      throw new Error(`Access to "${name}" is blocked`);
    };

    let ast: AstNode;
    try {
      ast = acorn.parse(code, {
        ecmaVersion: 2020,
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
      }) as unknown as AstNode;
    } catch {
      // Unparseable: refuse if it contains any forbidden name, otherwise leave it for the compiler
      // (which will raise the same syntax error the caller expects).
      for (const name of FORBIDDEN_PROPERTIES) {
        if (new RegExp(`\\b${name}\\b`).test(code)) forbid(name);
      }
      return code;
    }

    const dynamicKeys: { start: number; end: number }[] = [];

    walkAst(ast, (node) => {
      if (node.type === 'Identifier' && (node as { name?: string }).name === KEY_GUARD_NAME) {
        throw new Error(`Use of reserved identifier "${KEY_GUARD_NAME}" is not allowed`);
      }

      // `{ __proto__: ... }` sets the object's prototype — block the shorthand setter.
      if (node.type === 'Property' && !(node as { computed?: boolean }).computed) {
        const key = (node as { key?: AstNode }).key;
        const keyName =
          key?.type === 'Identifier'
            ? (key as { name?: string }).name
            : key?.type === 'Literal'
              ? String((key as { value?: unknown }).value)
              : undefined;
        if (keyName === '__proto__') forbid('__proto__');
      }

      if (node.type !== 'MemberExpression') return;
      const property = (node as { property?: AstNode }).property;
      if (!property) return;

      if (!(node as { computed?: boolean }).computed) {
        const propName = (property as { name?: string }).name;
        if (property.type === 'Identifier' && propName !== undefined && FORBIDDEN_PROPERTIES.has(propName)) {
          forbid(propName);
        }
        return;
      }

      const staticKey = resolveStaticString(property);
      if (staticKey !== null) {
        if (FORBIDDEN_PROPERTIES.has(staticKey)) forbid(staticKey);
        return; // Safe static key — no runtime guard needed.
      }

      // Dynamic key: guard it at runtime.
      dynamicKeys.push({ start: property.start, end: property.end });
    });

    if (dynamicKeys.length === 0) return code;

    // Wrap each dynamic key `expr` as `__sbKey(expr)`, applying insertions right-to-left so earlier
    // offsets stay valid (this also handles nested keys such as `o[a][b]`).
    const insertions: { pos: number; text: string }[] = [];
    for (const { start, end } of dynamicKeys) {
      insertions.push({ pos: start, text: `${KEY_GUARD_NAME}(` });
      insertions.push({ pos: end, text: ')' });
    }
    insertions.sort((a, b) => b.pos - a.pos || (a.text === ')' ? -1 : 1));

    let guarded = code;
    for (const { pos, text } of insertions) {
      guarded = guarded.slice(0, pos) + text + guarded.slice(pos);
    }
    return guarded;
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
    transformedCode = this.guardCode(transformedCode, { ...meta, workflowTemplateId });

    // Compile the code under the configured isolation level.
    const fn =
      this.config.isolationLevel === SandboxIsolationLevel.IsolatedVm
        ? this.compileInIsolatedVm(transformedCode, globalContext, !!options.isAsync)
        : new Function(...Object.keys(globalContext), `return ${transformedCode}`)(...Object.values(globalContext));

    this.cache.set(hash, fn);
    return fn;
  }

  /**
   * Compile code inside a real `isolated-vm` context so it cannot reach the host's global
   * object or Node built-ins. Only plain functions and JSON-safe data can cross the isolation
   * boundary: functions are bridged as callables backed by an `isolated-vm` Reference (invoked
   * synchronously via `applySync`, or asynchronously via `apply` with `{ result: { promise:
   * true } }` for `AsyncFunction`s), arguments/return values are copied by value, and rich
   * library namespaces in `ISOLATED_VM_UNSUPPORTED_GLOBALS` are omitted entirely.
   * @param {string} code Minified (and, if async, already transformed) code to execute.
   * @param {object} globalContext Globals to expose to the evaluated code.
   * @param {boolean} isAsync Whether the top-level code is an async function.
   * @returns {(...args: any[]) => any} Callable compiled function.
   */
  private compileInIsolatedVm(code: string, globalContext: Record<string, unknown>, isAsync: boolean): (...args: any[]) => any {
    const context = this.createContext();
    const refs: { refName: string; value: unknown }[] = [];

    const buildExpr = (value: unknown, seen: WeakSet<object>): string => {
      if (typeof value === 'function') {
        const refName = `__ref_${refs.length}`;
        const isAsyncFn = isAsyncFunctionValue(value);
        refs.push({ refName, value });
        const applyExpr = isAsyncFn
          ? `${refName}.apply(undefined, args, { arguments: { copy: true }, result: { promise: true, copy: true } })`
          : `${refName}.applySync(undefined, args, { arguments: { copy: true }, result: { copy: true } })`;
        return `function() { var args = Array.prototype.slice.call(arguments); return ${applyExpr}; }`;
      }

      if (value !== null && typeof value === 'object') {
        // Guard against cycles in caller-supplied globals (default globals are cycle-free).
        if (seen.has(value)) return 'undefined';
        seen.add(value);
        if (Array.isArray(value)) {
          return `[${value.map((v) => buildExpr(v, seen)).join(', ')}]`;
        }
        const entries = Object.entries(value).map(([key, v]) => `${JSON.stringify(key)}: ${buildExpr(v, seen)}`);
        return `{${entries.join(', ')}}`;
      }

      return JSON.stringify(value) ?? 'undefined';
    };

    const assignments = Object.entries(globalContext)
      .filter(([name]) => !ISOLATED_VM_UNSUPPORTED_GLOBALS.has(name))
      .map(([name, value]) => `var ${name} = ${buildExpr(value, new WeakSet())};`)
      .join('\n');

    for (const { refName, value } of refs) {
      context.jail.setSync(refName, new vm.Reference(value));
    }

    const wrappedCode = `(function() {\n${assignments}\nreturn ${code};\n})()`;

    if (isAsync) {
      const ref = context.context.evalSync(wrappedCode, { reference: true });
      const wrapped: AsyncBridgeFunction = (...args) =>
        ref.apply(undefined, args, { arguments: { copy: true }, result: { promise: true, copy: true } });
      wrapped[ASYNC_BRIDGE_MARKER] = true;
      return wrapped;
    }

    return context.context.evalSync(wrappedCode);
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

/**
 * Transform a function's source to `async`, awaiting calls to any of the given async
 * globals so a caller can pass a synchronous-looking arrow function that calls async
 * helpers without having to write `async`/`await` itself.
 * @param {string} functionString Function source code.
 * @param {string[]} allowedAsyncFunctions Names of async globals referenced by the function.
 * @returns {string} Transformed function source.
 */
function transformFunctionToAsync(functionString: string, allowedAsyncFunctions: string[] = []): string {
  const isFunctionStringContainsAsyncFunction = allowedAsyncFunctions.some(
    (v) => functionString.includes(v) && !functionString.includes(`await ${v}`),
  );

  // Return as is if async function not used.
  if (!isFunctionStringContainsAsyncFunction) {
    return functionString;
  }

  // Transform to async.
  let asyncFunctionString = functionString;
  if (!asyncFunctionString.startsWith('async')) {
    asyncFunctionString = `async ${asyncFunctionString}`;
  }
  for (const asyncFunctionInside of allowedAsyncFunctions) {
    asyncFunctionString = asyncFunctionString.replace(new RegExp(`(?<!\\.)\\b${asyncFunctionInside}\\b`, 'g'), `await ${asyncFunctionInside}`);
  }

  return asyncFunctionString;
}

/**
 * Get md5 hash.
 * @param {string} data Data.
 * @returns {string}
 */
function getMd5Hash(data: string): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Get sha256 hash.
 * @param {string} data Data.
 * @returns {string}
 */
function getSha256Hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Get sha512 hash.
 * @param {string} data Data.
 * @param {object} [options] Options.
 * @param {string} [options.hmac] HMAC secret.
 * @returns {string}
 */
function getSha512Hash(data: string, options?: { hmac?: string }): string {
  if (options?.hmac) {
    return crypto.createHmac('sha512', options.hmac).update(data).digest('hex');
  }
  return crypto.createHash('sha512').update(data).digest('hex');
}

/**
 * Base64 decode.
 * @param {string} data Base64 string.
 * @returns {string} RAW string.
 */
function base64Decode(data: string): string {
  return Buffer.from(data, 'base64').toString('utf8');
}

/**
 * Base64 encode.
 * @param {string} rawString RAW string.
 * @param {BufferEncoding} [rawStringEncoding] RAW string encoding. Default value: `utf8`.
 * @returns {string} Base64 string.
 */
function base64Encode(rawString: string = '', rawStringEncoding: BufferEncoding = 'utf8'): string {
  return Buffer.from(rawString, rawStringEncoding).toString('base64');
}

/**
 * Convert data to base64.
 * @param {string} data Data.
 * @returns {string} Base64 string.
 */
function toBase64(data: string): string {
  return Buffer.from(data).toString('base64');
}
