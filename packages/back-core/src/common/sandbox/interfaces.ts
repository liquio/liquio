/** Marks a host wrapper function (built by `compileInIsolatedVm` for async code) as
 * promise-returning, so nesting it as a global into another isolate — as happens when a
 * compiled workflow template function is exposed under `$.workflow` — bridges it correctly
 * even though the wrapper itself isn't declared `async`. */
export const ASYNC_BRIDGE_MARKER = Symbol('isolatedVmAsyncBridge');

/** A host wrapper function produced by `compileInIsolatedVm` for async code, tagged with
 * `ASYNC_BRIDGE_MARKER` so it can be recognized as promise-returning when nested as a global
 * into another isolate. */
export interface AsyncBridgeFunction {
  (...args: unknown[]): Promise<unknown>;
  [ASYNC_BRIDGE_MARKER]?: true;
}

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
