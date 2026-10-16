/** Minimal structural shape of the acorn AST nodes the sandbox guard inspects. */
export interface AstNode {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

/**
 * How evaluated code is isolated from the host process.
 */
export enum SandboxIsolationLevel {
  /** Compiled with `new Function(...)`. Fast, and gives every default global (including rich
   * libraries like `_`/`moment`) full fidelity, but code runs in the same V8 realm as the host
   * — it can reach and mutate the host's global object. Opt-in (`isolationLevel: "function"`). */
  Function = 'function',
  /** Compiled and run inside an `isolated-vm` isolate (see `./isolated.ts`). Code cannot touch the
   * host realm at all: `_`, `moment`, `Buffer` are loaded inside the isolate, `crypto` and `iconv` are
   * isolate shims, arguments and results are copied across the boundary. Slower and uses more memory than
   * `Function`. This is the default. */
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

/** Options of the `isolated-vm` engine shared by sandboxes (`SandboxIsolationLevel.IsolatedVm`). */
export interface IsolatedEngineOptions {
  /** Isolate memory limit in MB. */
  memoryLimit?: number;
  /** Timeout in ms for each synchronous execution. */
  timeout?: number;
  /** Max number of kept scope contexts (least recently used are released). */
  maxScopes?: number;
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
  /** How evaluated code is isolated from the host process. Default: `SandboxIsolationLevel.IsolatedVm`; any value
   * other than `SandboxIsolationLevel.Function` selects it. */
  isolationLevel?: SandboxIsolationLevel;
  /** Allow `isolationLevel: "function"` when NODE_ENV is `production`/`prod`. Default: `false`, i.e. the level is refused
   * there (an error is logged and the isolate is used). Outside production the level only logs a warning. */
  allowUnsafeFunctionIsolation?: boolean;
  /** Compile code of the `SandboxIsolationLevel.Function` level in strict mode, so a function called without a
   * receiver doesn't get the host global object as `this`. Default: `true`. */
  strictMode?: boolean;
  /** Isolate options for `SandboxIsolationLevel.IsolatedVm`. */
  isolated?: IsolatedEngineOptions;
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
