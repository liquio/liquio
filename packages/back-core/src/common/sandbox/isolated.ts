import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

import acorn from 'acorn';
import iconv from 'iconv-lite';
import vm from 'isolated-vm';
import { LRUCache } from 'lru-cache';

import { FORBIDDEN_PROPERTIES, KEY_GUARD_NAME } from './compile';
import { isAsyncFunctionValue } from './helpers';
import { IsolatedEngineOptions } from './interfaces';

/**
 * Isolated sandbox for pure data-mapping low-code functions.
 *
 * Unlike the `function` isolation level of `Sandbox` (which uses `new Function` in the host realm), the code is
 * compiled and executed inside a separate `isolated-vm` isolate without any access to the host: only standard
 * JavaScript built-ins plus `_` (lodash) and `moment` are available, arguments are deep-copied in, the result is
 * deep-copied out, and execution is bounded by a memory limit and a timeout.
 */

// Constants.
const DEFAULT_MEMORY_LIMIT = 128; // MB.
const DEFAULT_TIMEOUT = 1000; // ms.
const DEFAULT_ENGINE_MEMORY_LIMIT = 256; // MB, shared by all scopes of the engine.
const DEFAULT_MAX_SCOPES = 100; // ~1.2 MB per scope (lodash, moment, Buffer, shims, runtime) plus compiled functions.

const MAX_RANDOM_BYTES = 65536;

type AnyFunction = (...args: any[]) => any;

/**
 * Wrap CommonJS modules sources into a script that defines `globalThis[name] = require(entry)[exportName]`.
 * @param {string} name Global name.
 * @param {string} entry Entry module name.
 * @param {string[]} moduleNames Module names (resolved from node_modules).
 * @param {string} [exportName] Export to take, whole `module.exports` by default.
 * @returns {string} Code.
 */
function bundleCommonJs(name: string, entry: string, moduleNames: string[], exportName?: string): string {
  const modules = moduleNames
    // Trailing slash resolves npm package even if it shadows a Node.js core module (e.g. `buffer`).
    .map(
      (moduleName) =>
        `${JSON.stringify(moduleName)}: function (module, exports, require) {\n${fs.readFileSync(require.resolve(`${moduleName}/`), 'utf8')}\n}`,
    )
    .join(',\n');
  return `globalThis[${JSON.stringify(name)}] = (function () {
var modules = {${modules}};
var cache = {};
function req(moduleName) {
  if (cache[moduleName]) return cache[moduleName].exports;
  if (!modules[moduleName]) throw new Error('Module "' + moduleName + '" is not available in sandbox.');
  var module = cache[moduleName] = { exports: {} };
  modules[moduleName](module, module.exports, req);
  return module.exports;
}
var exported = req(${JSON.stringify(entry)});
return ${exportName ? `exported[${JSON.stringify(exportName)}]` : 'exported'};
})();`;
}

let librariesCode: string | undefined;

/**
 * Pure JS libraries defined as globals in every context: `_` (lodash), `moment` and `Buffer` (same API as Node.js
 * `Buffer`, except `base64url` encoding). The code is compiled once per isolate and run in each new context. Built
 * lazily, so loading this module doesn't read the libraries sources.
 * Note: V8 heap snapshots are NOT used - restored state is broken (moment parses `Z`/`+02:00` offsets as local
 * time, base64-js lookup tables are lost), see "should parse ISO dates with offsets" test.
 * @returns {string} Code.
 */
function getLibrariesCode(): string {
  librariesCode ??= [
    bundleCommonJs('_', 'lodash', ['lodash']),
    bundleCommonJs('moment', 'moment', ['moment']),
    bundleCommonJs('Buffer', 'buffer', ['buffer', 'base64-js', 'ieee754'], 'Buffer'),
    // Script completion value must not be a function: it is returned to the host as a handle that keeps the context
    // alive in the isolate until the host GC finalizes it, so released contexts would fill the isolate memory.
    'undefined;',
  ].join('\n');
  return librariesCode;
}

/**
 * Define libraries globals in context.
 * @param {vm.Isolate} isolate Isolate.
 * @param {vm.Context} context Context.
 * @param {WeakMap} [scriptsCache] Compiled scripts cache (isolate => script).
 */
function defineLibraries(isolate: vm.Isolate, context: vm.Context, scriptsCache?: WeakMap<vm.Isolate, vm.Script>): void {
  let script = scriptsCache?.get(isolate);
  if (!script) {
    script = isolate.compileScriptSync(getLibrariesCode());
    scriptsCache?.set(isolate, script);
  }
  script.runSync(context);
}

/**
 * Produce a structured-cloneable, host-free copy of a value so it can safely cross into the isolate.
 * @param {any} value Value.
 * @returns {any} Cloneable value.
 */
function toCloneable(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}

/**
 * Compile a function expression inside a new isolate, run it once with arguments and dispose the isolate.
 * @param {string} code Function expression, e.g. `({ userInfo }) => ({ ... })`.
 * @param {any[]} [args] Arguments passed to the function.
 * @param {object} [options] Options.
 * @param {number} [options.memoryLimit] Memory limit in MB.
 * @param {number} [options.timeout] Timeout in ms for compilation and for execution.
 * @returns {any} Function result (copy).
 */
export function runInIsolate(code: string, args: unknown[] = [], options: { memoryLimit?: number; timeout?: number } = {}): any {
  if (typeof code !== 'string' || code.length === 0) {
    throw new Error('Code must be a non-empty string.');
  }

  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const isolate = new vm.Isolate({ memoryLimit: options.memoryLimit ?? DEFAULT_MEMORY_LIMIT });

  try {
    const context = isolate.createContextSync();
    defineLibraries(isolate, context);
    const fnRef = context.evalSync(code, { reference: true, timeout });
    if (!fnRef || fnRef.typeof !== 'function') {
      throw new Error('Code did not evaluate to a function.');
    }

    return fnRef.applySync(undefined, args.map(toCloneable), {
      arguments: { copy: true },
      result: { copy: true },
      timeout,
    });
  } finally {
    if (!isolate.isDisposed) {
      isolate.dispose();
    }
  }
}

// Marker of a class instance copy, the isolate restores its prototype (see `RUNTIME_CODE`).
const CLASS_MARKER = '__sandboxClass__';

/**
 * Produce a structured-cloneable, host-free copy of a value (functions are dropped, moment objects become Dates,
 * cycles are preserved). Class instances (entities) are copied with values of their prototype getters and are
 * marked with class name, so the isolate can restore prototype methods (see `IsolatedEngine.getClassDefinition`).
 * @param {any} value Value.
 * @param {WeakMap} [seen] Already copied objects.
 * @param {Map<string, function>} [classes] Collector of met classes (name => constructor).
 * @returns {any} Cloneable value.
 */
export function toTransferable(value: any, seen: WeakMap<object, unknown> = new WeakMap(), classes?: Map<string, AnyFunction>): any {
  if (typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (seen.has(value)) {
    return seen.get(value);
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (value instanceof RegExp || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    return value;
  }
  if (typeof value._isAMomentObject === 'boolean' && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (value instanceof Map) {
    const copy = new Map();
    seen.set(value, copy);
    for (const [k, v] of value) copy.set(toTransferable(k, seen, classes), toTransferable(v, seen, classes));
    return copy;
  }
  if (value instanceof Set) {
    const copy = new Set();
    seen.set(value, copy);
    for (const v of value) copy.add(toTransferable(v, seen, classes));
    return copy;
  }
  if (Array.isArray(value)) {
    const copy = [];
    seen.set(value, copy);
    for (const v of value) copy.push(toTransferable(v, seen, classes));
    return copy;
  }
  const copy: Record<string, unknown> = {};
  seen.set(value, copy);
  for (const key of Object.keys(value)) {
    const v = value[key];
    if (typeof v !== 'function') {
      copy[key] = toTransferable(v, seen, classes);
    }
  }

  // Class instance: copy prototype getters values and mark class to restore prototype methods in the isolate.
  const proto = Object.getPrototypeOf(value);
  if (proto && proto !== Object.prototype && typeof proto.constructor === 'function' && proto.constructor.name) {
    for (const [key, getter] of getPrototypeGetters(proto)) {
      if (key in copy) continue;
      try {
        copy[key] = toTransferable(getter.call(value), seen, classes);
      } catch {
        // Getter may depend on unavailable state, skip it.
      }
    }
    if (classes && getPrototypeMethods(proto).size > 0) {
      classes.set(proto.constructor.name, proto.constructor);
      copy[CLASS_MARKER] = proto.constructor.name;
    }
  }
  return copy;
}

/**
 * Walk prototype chain (child first, without `Object.prototype`).
 * @param {object} proto Prototype.
 * @returns {object[]}
 */
function getPrototypeChain(proto: object): object[] {
  const chain: object[] = [];
  for (let p = proto; p && p !== Object.prototype; p = Object.getPrototypeOf(p)) chain.push(p);
  return chain;
}

/**
 * Get prototype getters (child overrides parent).
 * @param {object} proto Prototype.
 * @returns {Map<string, function>}
 */
function getPrototypeGetters(proto: object): Map<string, () => unknown> {
  const getters = new Map<string, () => unknown>();
  for (const p of getPrototypeChain(proto)) {
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(p))) {
      if (!getters.has(key) && typeof descriptor.get === 'function') getters.set(key, descriptor.get);
    }
  }
  return getters;
}

/**
 * Get prototype methods (child overrides parent), native methods are skipped.
 * @param {object} proto Prototype.
 * @returns {Map<string, function>}
 */
function getPrototypeMethods(proto: object): Map<string, AnyFunction> {
  const methods = new Map<string, AnyFunction>();
  for (const p of getPrototypeChain(proto)) {
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(p))) {
      if (
        key !== 'constructor' &&
        !methods.has(key) &&
        typeof descriptor.value === 'function' &&
        !/\{\s*\[native code\]\s*\}$/.test(Function.prototype.toString.call(descriptor.value))
      ) {
        methods.set(key, descriptor.value);
      }
    }
  }
  return methods;
}

/**
 * Convert typed arrays copied out of the isolate back to `Buffer` (the isolate `Buffer` is copied as `Uint8Array`).
 * @param {any} value Value.
 * @param {number} [depth] Depth.
 * @returns {any}
 */
function toHostValue(value: any, depth: number = 0): any {
  if (value instanceof Uint8Array && !Buffer.isBuffer(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  // Dates are copied in the main Node.js realm, keep them `instanceof Date` for code running in other realms (jest).
  if (value !== null && typeof value === 'object' && !(value instanceof Date) && Object.prototype.toString.call(value) === '[object Date]') {
    return new Date(value.getTime());
  }
  if (value === null || typeof value !== 'object' || depth > 50 || value instanceof Date || ArrayBuffer.isView(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = toHostValue(value[i], depth + 1);
  } else if (Object.getPrototypeOf(Object.getPrototypeOf(value) ?? Object.prototype) === null) {
    // Plain object of any realm (copied objects are created in the main Node.js realm).
    for (const key of Object.keys(value)) value[key] = toHostValue(value[key], depth + 1);
  }
  return value;
}

/**
 * Is plain object (not a class instance).
 * @param {any} value Value.
 * @returns {boolean}
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Is code parsable as script.
 * @param {string} code Code.
 * @returns {boolean}
 */
function isParsable(code: string): boolean {
  try {
    acorn.parse(code, { ecmaVersion: 'latest' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Host side of `crypto`/`iconv` shims. Only strings and byte arrays cross the isolate boundary (copied).
 */
const HOST_SHIM_FUNCTIONS = {
  hash: (
    algorithm: string,
    chunks: Uint8Array[],
    hmacKey: Uint8Array | undefined,
    encoding: crypto.BinaryToTextEncoding | undefined,
  ): string | Uint8Array => {
    const hash = hmacKey ? crypto.createHmac(String(algorithm), Buffer.from(hmacKey)) : crypto.createHash(String(algorithm));
    for (const chunk of chunks) hash.update(Buffer.from(chunk));
    return encoding ? hash.digest(String(encoding) as crypto.BinaryToTextEncoding) : new Uint8Array(hash.digest());
  },
  randomBytes: (size: number): Uint8Array => {
    if (!Number.isSafeInteger(size) || size < 0 || size > MAX_RANDOM_BYTES) {
      throw new RangeError(`randomBytes size must be an integer from 0 to ${MAX_RANDOM_BYTES}.`);
    }
    return new Uint8Array(crypto.randomBytes(size));
  },
  randomUUID: (): string => crypto.randomUUID(),
  iconvDecode: (bytes: Uint8Array, encoding: string): string => iconv.decode(Buffer.from(bytes), String(encoding)),
  iconvEncode: (string: string, encoding: string): Uint8Array => new Uint8Array(iconv.encode(String(string), String(encoding))),
  iconvEncodingExists: (encoding: string): boolean => iconv.encodingExists(String(encoding)),
};

// Isolate side of shims: Node.js-like `crypto` (hashes, HMAC, random), `iconv`, `atob`/`btoa`,
// `TextEncoder`/`TextDecoder`, `structuredClone` (pure JS, no host calls). Host callbacks stay in the closure and are never exposed to user code.
const SHIMS_CODE = `
const [hostHash, hostRandomBytes, hostRandomUUID, hostIconvDecode, hostIconvEncode, hostIconvEncodingExists] = [$0, $1, $2, $3, $4, $5];
const B = globalThis.Buffer;
const toBytes = (data, encoding) => {
  if (typeof data === 'string') return new Uint8Array(B.from(data, encoding));
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice();
  if (data instanceof ArrayBuffer) return new Uint8Array(data).slice();
  throw new TypeError('The "data" argument must be of type string or an instance of Buffer, TypedArray, or DataView.');
};
class Hash {
  constructor(algorithm, hmacKey) { this.algorithm = algorithm; this.hmacKey = hmacKey; this.chunks = []; }
  update(data, encoding) { this.chunks.push(toBytes(data, encoding)); return this; }
  digest(encoding) {
    const result = hostHash(this.algorithm, this.chunks, this.hmacKey, encoding);
    return encoding ? result : B.from(result);
  }
}
const notAvailable = (name) => () => { throw new Error('crypto.' + name + ' is not available in sandbox.'); };
globalThis.crypto = Object.freeze({
  createHash: (algorithm) => new Hash(algorithm),
  createHmac: (algorithm, key) => new Hash(algorithm, toBytes(key)),
  randomBytes: (size) => B.from(hostRandomBytes(size)),
  randomUUID: () => hostRandomUUID(),
  createCipheriv: notAvailable('createCipheriv'),
  createDecipheriv: notAvailable('createDecipheriv'),
  createSign: notAvailable('createSign'),
  createVerify: notAvailable('createVerify'),
});
globalThis.iconv = Object.freeze({
  decode: (data, encoding) => hostIconvDecode(toBytes(data, 'binary'), encoding),
  encode: (string, encoding) => B.from(hostIconvEncode(string, encoding)),
  encodingExists: (encoding) => hostIconvEncodingExists(encoding),
});
globalThis.btoa = (data) => B.from(String(data), 'latin1').toString('base64');
globalThis.atob = (data) => B.from(String(data), 'base64').toString('latin1');
globalThis.TextEncoder = class TextEncoder {
  get encoding() { return 'utf-8'; }
  encode(string = '') { return new Uint8Array(B.from(String(string), 'utf8')); }
};
globalThis.TextDecoder = class TextDecoder {
  constructor(encoding = 'utf-8') { this.encoding = String(encoding).toLowerCase(); }
  decode(data) {
    if (data === undefined) return '';
    const bytes = toBytes(data);
    return ['utf-8', 'utf8'].includes(this.encoding) ? B.from(bytes).toString('utf8') : hostIconvDecode(bytes, this.encoding);
  }
};
const dataCloneError = (message) => Object.assign(new Error(message), { name: 'DataCloneError' });
const cloneValue = (value, seen) => {
  if (typeof value === 'function') throw dataCloneError((value.name || 'function') + ' could not be cloned.');
  if (typeof value === 'symbol') throw dataCloneError(String(value) + ' could not be cloned.');
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  const tag = Object.prototype.toString.call(value);
  let result;
  if (tag === '[object Date]') {
    result = new Date(value.getTime());
  } else if (tag === '[object RegExp]') {
    result = new RegExp(value.source, value.flags);
  } else if (tag === '[object Boolean]' || tag === '[object Number]' || tag === '[object String]') {
    result = Object(value.valueOf());
  } else if (value instanceof ArrayBuffer) {
    result = value.slice(0);
  } else if (ArrayBuffer.isView(value)) {
    // As in Node.js, \`Buffer\` is cloned as \`Uint8Array\`.
    const Ctor = value instanceof DataView ? DataView : B.isBuffer(value) ? Uint8Array : value.constructor;
    const buffer = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    result = Ctor === DataView ? new DataView(buffer) : new Ctor(buffer);
  } else if (value instanceof Map) {
    result = new Map();
    seen.set(value, result);
    for (const [k, v] of value) result.set(cloneValue(k, seen), cloneValue(v, seen));
    return result;
  } else if (value instanceof Set) {
    result = new Set();
    seen.set(value, result);
    for (const v of value) result.add(cloneValue(v, seen));
    return result;
  } else if (value instanceof Error) {
    const Ctor = { EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError }[value.name] || Error;
    result = new Ctor(value.message);
    seen.set(value, result);
    if (value.stack !== undefined) result.stack = String(value.stack);
    if ('cause' in value) result.cause = cloneValue(value.cause, seen);
    return result;
  } else if (Array.isArray(value)) {
    result = new Array(value.length);
    seen.set(value, result);
    for (const key of Object.keys(value)) result[key] = cloneValue(value[key], seen);
    return result;
  } else if (tag === '[object Promise]' || tag === '[object WeakMap]' || tag === '[object WeakSet]') {
    throw dataCloneError(tag.slice(8, -1) + ' object could not be cloned.');
  } else {
    // Class instances become plain objects with own enumerable properties (prototype is not cloned).
    result = {};
    seen.set(value, result);
    for (const key of Object.keys(value)) result[key] = cloneValue(value[key], seen);
    return result;
  }
  seen.set(value, result);
  return result;
};
globalThis.structuredClone = (value) => cloneValue(value, new Map());
`;

// Isolate runtime used by compiled code wrappers (`globalThis.__sandboxRuntime`, frozen):
// - `wrap(fn)` - restore arguments (`Uint8Array` => `Buffer`, class prototypes by marker), normalize result
//   (moment => Date, functions are dropped, class instances become plain objects) and errors (non-Error throws);
// - `host(fn)` - wrap host function so its `Uint8Array` results become `Buffer`;
// - `out(value)` - normalize value.
// Class prototypes are defined only with the scope token (`$0`), user code can not define or change them.
const RUNTIME_CODE = `
const token = $0;
const B = globalThis.Buffer;
const MARK = ${JSON.stringify(CLASS_MARKER)};
const classes = Object.create(null);
const isPlain = (v) => { const p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; };
const isThenable = (v) => v !== null && (typeof v === 'object' || typeof v === 'function') && typeof v.then === 'function';
const revive = (v, seen) => {
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Uint8Array) return B.isBuffer(v) ? v : B.from(v.buffer, v.byteOffset, v.byteLength);
  if (seen.has(v)) return v;
  seen.add(v);
  if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) v[i] = revive(v[i], seen); return v; }
  if (v instanceof Map) { for (const [k, x] of v) v.set(k, revive(x, seen)); return v; }
  if (!isPlain(v)) return v;
  for (const k of Object.keys(v)) v[k] = revive(v[k], seen);
  if (typeof v[MARK] === 'string') {
    const proto = classes[v[MARK]];
    delete v[MARK];
    if (proto) Object.setPrototypeOf(v, proto);
  }
  return v;
};
const out = (v, seen = new Map()) => {
  if (v === null || (typeof v !== 'object' && typeof v !== 'function')) return typeof v === 'symbol' ? undefined : v;
  if (typeof v === 'function') return undefined;
  if (seen.has(v)) return seen.get(v);
  if (v instanceof Date || v instanceof RegExp || v instanceof Error || ArrayBuffer.isView(v) || v instanceof ArrayBuffer) return v;
  if (typeof v._isAMomentObject === 'boolean' && typeof v.toDate === 'function') return v.toDate();
  if (isThenable(v)) return undefined;
  if (v instanceof Map) { const c = new Map(); seen.set(v, c); for (const [k, x] of v) c.set(out(k, seen), out(x, seen)); return c; }
  if (v instanceof Set) { const c = new Set(); seen.set(v, c); for (const x of v) c.add(out(x, seen)); return c; }
  if (Array.isArray(v)) { const c = []; seen.set(v, c); for (const x of v) c.push(out(x, seen)); return c; }
  const c = {};
  seen.set(v, c);
  for (const k of Object.keys(v)) {
    if (typeof v[k] === 'function' || typeof v[k] === 'symbol') continue;
    c[k] = out(v[k], seen);
  }
  return c;
};
const err = (e) => {
  if (e instanceof Error) return e;
  if (typeof e === 'string') return new Error(e);
  try { return new Error(JSON.stringify(e)); } catch { return new Error(String(e)); }
};
const wrap = (fn) => function (...args) {
  let result;
  try {
    result = fn(...revive(args, new Set()));
  } catch (e) {
    throw err(e);
  }
  if (isThenable(result)) return Promise.resolve(result).then((x) => out(x), (e) => { throw err(e); });
  return out(result);
};
const host = (fn) => typeof fn !== 'function' ? fn : function (...args) {
  const result = fn(...args);
  return isThenable(result) ? result.then((x) => revive(x, new Set())) : revive(result, new Set());
};
const defineClass = (classToken, name, proto) => {
  if (classToken !== token || classes[name]) return;
  classes[name] = Object.freeze(proto);
};
Object.defineProperty(globalThis, '__sandboxRuntime', {
  value: Object.freeze({ wrap, host, out: (v) => out(v), defineClass }),
  enumerable: false,
  writable: false,
  configurable: false,
});
// Runtime guard injected around dynamic property keys by \`guardCode\` (see ./compile.ts).
const forbiddenKeys = new Set(${JSON.stringify([...FORBIDDEN_PROPERTIES])});
Object.defineProperty(globalThis, ${JSON.stringify(KEY_GUARD_NAME)}, {
  value: (key) => {
    if (typeof key === 'symbol') return key;
    const resolved = String(key);
    if (forbiddenKeys.has(resolved)) throw new Error('Access to "' + resolved + '" is blocked');
    return resolved;
  },
  enumerable: false,
  writable: false,
  configurable: false,
});
`;

// Set value by path (JSON array of keys) relative to `globalThis`. `$0` is path, `$1` is value.
const SET_BY_PATH_CODE = 'const p = JSON.parse($0); let o = globalThis; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = $1;';
// Bridge to an async host function. The reference stays in the closure and is never exposed to user code.
const SET_ASYNC_BRIDGE_CODE =
  'const p = JSON.parse($0); const r = $1; let o = globalThis; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; ' +
  'o[p[p.length - 1]] = (...args) => r.apply(undefined, args, { arguments: { copy: true }, result: { copy: true, promise: true } });';

/** A scope context: one per workflow template, shared by all code compiled for it. */
interface IsolatedScope {
  isolate: vm.Isolate;
  context: vm.Context;
  token: string;
  classes: Set<string>;
  refs: Set<vm.Reference>;
  released: boolean;
  release: () => void;
}

/** Code compiled in a scope. */
interface CompiledCode {
  ref: vm.Reference;
  scope: IsolatedScope;
  release: () => void;
}

/** Options of `IsolatedEngine.compile`. */
export interface IsolatedCompileOptions {
  /** Scope key, e.g. workflow template ID. Default scope is shared. */
  scopeKey?: string;
  /** Globals defined once per scope (visible to workflow template global functions). */
  scopeGlobals?: Record<string, unknown>;
  /** Globals of this code: functions are exposed as copying bridges, other values are copied. */
  globals?: Record<string, unknown>;
  /** Globals that are `undefined` for this code. */
  hiddenGlobals?: string[];
  /** Workflow template global functions sources. */
  globalFunctions?: Record<string, string>;
  /** Global functions object name, e.g. `$`. */
  globalFunctionsObject?: string;
  /** Count of declared arguments of the function, extra arguments are not copied into the isolate. */
  maxArgs?: number;
  /** Returned function resolves a promise. */
  isAsync?: boolean;
  /** Called with (name, error) when a global function can not be compiled. */
  onSetupError?: (name: string, error: Error) => void;
  /** Called with (name, error) when a prototype of a class met in arguments can not be defined. */
  onDefineClassError?: (name: string, error: Error) => void;
}

/**
 * Shared-isolate engine for `Sandbox` (`isolationLevel = "isolated-vm"`).
 *
 * Code runs inside one shared isolate that has no access to the host. Contexts (own globals and built-in
 * prototypes) are shared per scope - a workflow template - so memory is bounded by the number of active templates,
 * not by the number of evaluated snippets. Host helpers are exposed only as functions whose arguments and results
 * are copied; function arguments are deep-copied in and results are deep-copied out.
 */
export class IsolatedEngine {
  memoryLimit: number;
  timeout: number;
  isolate: vm.Isolate | undefined;
  private releasers: WeakMap<AnyFunction, () => void>;
  private scopes: LRUCache<string, IsolatedScope>;
  private globalsCounter: number;
  private librariesScripts: WeakMap<vm.Isolate, vm.Script>;
  private classDefinitions: Map<string, { ctor: AnyFunction; code: string | undefined }>;

  /**
   * @param {IsolatedEngineOptions} [options] Options.
   */
  constructor(options: IsolatedEngineOptions = {}) {
    this.memoryLimit = options.memoryLimit ?? DEFAULT_ENGINE_MEMORY_LIMIT;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.isolate = undefined;
    this.releasers = new WeakMap();
    this.scopes = new LRUCache({
      max: options.maxScopes ?? DEFAULT_MAX_SCOPES,
      dispose: (scope): void => scope.release(),
    });
    this.globalsCounter = 0;
    this.librariesScripts = new WeakMap();
    this.classDefinitions = new Map();
  }

  /**
   * Get shared isolate, recreate it if it was disposed (e.g. after reaching memory limit).
   * @returns {vm.Isolate}
   */
  getIsolate(): vm.Isolate {
    if (!this.isolate || this.isolate.isDisposed) {
      this.isolate = new vm.Isolate({ memoryLimit: this.memoryLimit });
      this.scopes.clear();
    }
    return this.isolate;
  }

  /**
   * Define prototypes of classes met in arguments (entities) in scope, so templates can call their methods.
   * Methods are compiled from host class sources inside the isolate, so they have no host access; methods that
   * use module-scope host identifiers throw `ReferenceError` when called.
   * @param {IsolatedScope} scope Scope.
   * @param {Map<string, function>} classes Classes (name => constructor).
   * @param {function} [onError] Called with (name, error) when a class prototype can not be defined.
   */
  private defineClasses(scope: IsolatedScope, classes: Map<string, AnyFunction>, onError?: (name: string, error: Error) => void): void {
    for (const [name, ctor] of classes) {
      if (scope.classes.has(name)) continue;
      scope.classes.add(name);
      const definition = this.getClassDefinition(name, ctor);
      if (!definition) continue;
      try {
        scope.context.evalClosureSync(`globalThis.__sandboxRuntime.defineClass($0, $1, ${definition});`, [scope.token, name], {
          timeout: this.timeout,
        });
      } catch (error) {
        onError?.(name, error);
      }
    }
  }

  /**
   * Get class prototype definition code (cached).
   * @param {string} name Class name.
   * @param {function} ctor Constructor.
   * @returns {string|undefined} Code of an expression returning prototype object.
   */
  private getClassDefinition(name: string, ctor: AnyFunction): string | undefined {
    if (this.classDefinitions.get(name)?.ctor === ctor) {
      return this.classDefinitions.get(name).code;
    }

    const methods: string[] = [];
    for (const [methodName, fn] of getPrototypeMethods(ctor.prototype)) {
      const source = Function.prototype.toString.call(fn);
      // Class methods are stringified as method definitions (`name(a) { ... }`), assigned ones as expressions.
      let expression: string | undefined;
      if (isParsable(`({ ${source} })`)) {
        expression = `({ ${source} })[${JSON.stringify(methodName)}]`;
      } else if (isParsable(`(${source})`)) {
        expression = `(${source})`;
      }
      if (expression) {
        methods.push(`d(${JSON.stringify(methodName)}, ${expression});`);
      }
    }
    const code =
      methods.length === 0
        ? undefined
        : `(() => {
const p = {};
const d = (k, f) => Object.defineProperty(p, k, { value: f, writable: false, enumerable: false, configurable: false });
${methods.join('\n')}
return p;
})()`;
    this.classDefinitions.set(name, { ctor, code });
    return code;
  }

  /**
   * Release scope context (e.g. when workflow template global functions are changed).
   * Functions compiled in this scope are recompiled on the next call.
   * @param {string} scopeKey Scope key.
   */
  resetScope(scopeKey: string): void {
    this.scopes.delete(scopeKey);
  }

  /**
   * Compile code (an expression, as for `new Function(...globalNames, 'return ' + code)`) in a scope context.
   * @param {string} code Code.
   * @param {IsolatedCompileOptions} [options] Options.
   * @returns {any} Copied value or host function wrapper if code evaluates to function.
   */
  compile(code: string, options: IsolatedCompileOptions = {}): any {
    let compiled = this.compileInScope(code, options);
    if (compiled.ref.typeof !== 'function') {
      try {
        return toHostValue(compiled.ref.copySync());
      } finally {
        compiled.release();
      }
    }

    const isAsync = !!options.isAsync || /^\s*async\b/.test(code);
    const { maxArgs } = options;
    const wrapper = (...args: unknown[]): unknown => {
      // Recompile if scope was released or isolate was disposed (e.g. reached memory limit).
      if (compiled.scope.released || compiled.scope.isolate.isDisposed) {
        compiled = this.compileInScope(code, options);
      }
      // Do not copy arguments the function does not declare (e.g. `index` and `array` of `Array.filter` callback).
      const usedArgs = Number.isInteger(maxArgs) ? args.slice(0, maxArgs) : args;
      const classes = new Map<string, AnyFunction>();
      const seen = new WeakMap<object, unknown>();
      const transferableArgs = usedArgs.map((arg) => toTransferable(arg, seen, classes));
      this.defineClasses(compiled.scope, classes, options.onDefineClassError);
      if (isAsync) {
        return Promise.resolve(
          compiled.ref.apply(undefined, transferableArgs, {
            arguments: { copy: true },
            result: { copy: true, promise: true },
            timeout: this.timeout,
          }),
        ).then(toHostValue);
      }
      return toHostValue(
        compiled.ref.applySync(undefined, transferableArgs, {
          arguments: { copy: true },
          result: { copy: true },
          timeout: this.timeout,
        }),
      );
    };
    this.releasers.set(wrapper, () => compiled.release());
    return wrapper;
  }

  /**
   * Release compiled function wrapper.
   * @param {any} value Value returned by `compile`.
   */
  release(value: unknown): void {
    const release = typeof value === 'function' && this.releasers.get(value as AnyFunction);
    if (release) {
      this.releasers.delete(value as AnyFunction);
      release();
    }
  }

  /**
   * Get or create scope context.
   */
  private getScope(
    scopeKey: string,
    { scopeGlobals = {}, globalFunctions = {}, globalFunctionsObject = '$', onSetupError }: IsolatedCompileOptions,
  ): IsolatedScope {
    const isolate = this.getIsolate();
    const existing = this.scopes.get(scopeKey);
    if (existing && !existing.released) {
      return existing;
    }

    const context = isolate.createContextSync();
    const scope: IsolatedScope = {
      isolate,
      context,
      token: crypto.randomUUID(),
      classes: new Set(),
      // Compiled function references. A reference held by the host keeps the context alive in the isolate until
      // the host GC finalizes it, so they are released with the scope.
      refs: new Set(),
      released: false,
      release: (): void => {
        scope.released = true;
        for (const ref of scope.refs) {
          try {
            ref.release();
          } catch {
            // Isolate may be already disposed.
          }
        }
        scope.refs.clear();
        try {
          context.release();
        } catch {
          // Isolate may be already disposed.
        }
      },
    };

    try {
      context.evalSync('globalThis.global = {};');
      defineLibraries(isolate, context, this.librariesScripts);
      context.evalClosureSync(
        SHIMS_CODE,
        [
          HOST_SHIM_FUNCTIONS.hash,
          HOST_SHIM_FUNCTIONS.randomBytes,
          HOST_SHIM_FUNCTIONS.randomUUID,
          HOST_SHIM_FUNCTIONS.iconvDecode,
          HOST_SHIM_FUNCTIONS.iconvEncode,
          HOST_SHIM_FUNCTIONS.iconvEncodingExists,
        ].map((fn) => new vm.Callback(fn as AnyFunction)),
      );
      context.evalClosureSync(RUNTIME_CODE, [scope.token]);
      for (const [name, value] of Object.entries(scopeGlobals)) {
        this.inject(context, [name], value);
      }

      // Workflow template global functions are compiled once per scope.
      this.inject(context, [globalFunctionsObject], { workflow: {} });
      for (const [name, source] of Object.entries(globalFunctions)) {
        try {
          context.evalSync(
            `globalThis[${JSON.stringify(globalFunctionsObject)}].workflow[${JSON.stringify(name)}] = (function () { return ${source}\n})(); undefined;`,
            { timeout: this.timeout },
          );
        } catch (error) {
          onSetupError?.(name, error);
        }
      }
    } catch (error) {
      scope.release();
      throw error;
    }

    this.scopes.set(scopeKey, scope);
    return scope;
  }

  /**
   * Compile code in scope. Code globals are passed as parameters (as on the `function` level), so they are not
   * shared with other code of the same scope.
   */
  private compileInScope(code: string, options: IsolatedCompileOptions): CompiledCode {
    const { scopeKey = 'default', globals = {}, hiddenGlobals = [] } = options;
    const scope = this.getScope(scopeKey, options);
    const { context } = scope;

    // Pass code globals through a temporary global that is removed before user code runs.
    const holderName = `__sandboxGlobals${++this.globalsCounter}`;
    const holder = JSON.stringify(holderName);
    const names = [...new Set([...Object.keys(globals), ...hiddenGlobals])];
    // Service identifiers are prefixed, because user code is lexically nested in this wrapper.
    const params = names.map((name) => `__sandboxRt__.host(__sandboxG__[${JSON.stringify(name)}])`).join(', ');
    try {
      this.inject(context, [holderName], {});
      for (const [name, value] of Object.entries(globals)) {
        this.inject(context, [holderName, name], value);
      }
      const ref: vm.Reference = context.evalSync(
        `(function (__sandboxG__, __sandboxRt__) { delete globalThis[${holder}]; ` +
          `const __sandboxValue__ = (function (${names.join(', ')}) { return ${code}\n})(${params}); ` +
          "return typeof __sandboxValue__ === 'function' ? __sandboxRt__.wrap(__sandboxValue__) : __sandboxRt__.out(__sandboxValue__); " +
          `})(globalThis[${holder}], globalThis.__sandboxRuntime)`,
        { reference: true, timeout: this.timeout },
      );
      scope.refs.add(ref);
      return {
        ref,
        scope,
        release: (): void => {
          scope.refs.delete(ref);
          try {
            ref.release();
          } catch {
            // Isolate may be already disposed.
          }
        },
      };
    } catch (error) {
      try {
        context.evalSync(`delete globalThis[${holder}];`);
      } catch {
        // Isolate may be already disposed.
      }
      throw error;
    }
  }

  /**
   * Inject host value into context by path.
   */
  private inject(context: vm.Context, path: string[], value: unknown, depth: number = 0): void {
    if (value === undefined) {
      return;
    }
    const pathJson = JSON.stringify(path);
    // Host functions get `Buffer` instead of `Uint8Array` copied from the isolate `Buffer`. `isAsyncFunctionValue`
    // also detects async functions downleveled by TypeScript (no native `AsyncFunction` constructor).
    if (typeof value === 'function' && isAsyncFunctionValue(value)) {
      const hostFn = async (...args: unknown[]): Promise<unknown> => (value as AnyFunction)(...args.map((arg) => toHostValue(arg)));
      context.evalClosureSync(SET_ASYNC_BRIDGE_CODE, [pathJson, new vm.Reference(hostFn)]);
    } else if (typeof value === 'function') {
      const hostFn = (...args: unknown[]): unknown => (value as AnyFunction)(...args.map((arg) => toHostValue(arg)));
      context.evalClosureSync(SET_BY_PATH_CODE, [pathJson, new vm.Callback(hostFn)]);
    } else if (isPlainObject(value) && depth < 5 && Object.values(value).some((v) => typeof v === 'function' || isPlainObject(v))) {
      context.evalClosureSync(SET_BY_PATH_CODE, [pathJson, {}], { arguments: { copy: true } });
      for (const [key, v] of Object.entries(value)) {
        this.inject(context, [...path, key], v, depth + 1);
      }
    } else {
      context.evalClosureSync(SET_BY_PATH_CODE, [pathJson, toTransferable(value)], { arguments: { copy: true } });
    }
  }
}
