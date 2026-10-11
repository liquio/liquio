/**
 * Read-only views of host objects for the `function` isolation level, where evaluated code runs in the host realm
 * and would otherwise share (and could overwrite) the host's built-ins and helpers: `JSON.parse = ...`,
 * `Object.assign(Error, { prepareStackTrace })`, `moment.fn.format = ...` or `_.mixin(...)` would change them for the
 * whole process.
 */

import { builtinModules } from 'node:module';

const readOnlyViews = new WeakMap<object, unknown>();

const deny = (action: string) => (): never => {
  throw new TypeError(`Cannot ${action} a sandbox built-in`);
};

/**
 * Get a deep read-only view of an object or function. Writes to the view, or to any object or function read through
 * it, throw. Calls and `new` are forwarded, and their results are returned as is (`moment()` returns a real moment).
 * `prototype` is returned as is too, so `instanceof`, subclassing and constructed instances keep real prototypes:
 * low-code can't name `prototype` (`guardCode` blocks it).
 * @param {unknown} target Value.
 * @returns {unknown} Read-only view, or the value itself if it is a primitive.
 */
export function readOnly<T>(target: T): T {
  if ((typeof target !== 'object' && typeof target !== 'function') || target === null) {
    return target;
  }
  const cached = readOnlyViews.get(target as object);
  if (cached) {
    return cached as T;
  }

  const view = new Proxy(target as object, {
    get(object, key): unknown {
      const value = Reflect.get(object, key, object);
      return key === 'prototype' ? value : readOnly(value);
    },
    set: deny('set a property of'),
    defineProperty: deny('define a property of'),
    deleteProperty: deny('delete a property of'),
    setPrototypeOf: deny('set the prototype of'),
    preventExtensions: deny('prevent extensions of'),
    apply: (fn, thisArg, args): unknown => Reflect.apply(fn as (...args: unknown[]) => unknown, thisArg, args),
    construct: (Ctor, args, newTarget): object => Reflect.construct(Ctor as Function, args, newTarget === view ? (Ctor as Function) : newTarget),
  });
  readOnlyViews.set(target as object, view);
  return view as T;
}

// Host globals that are never exposed (process/module access, or a global object handle). `eval` is not listed: it
// can't be a strict-mode parameter name, and `guardCode` rejects any reference to it.
const HIDDEN_HOST_GLOBALS = new Set([
  'process',
  'require',
  'module',
  'exports',
  '__filename',
  '__dirname',
  'global',
  'globalThis',
  'Function',
  'Reflect',
]);
// Lazy module loaders defined as global accessors in the REPL and `node -e` (`fs`, `child_process`, ...).
const MODULE_GLOBALS = new Set(builtinModules);
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

let hostGlobals: Record<string, unknown> | undefined;

/**
 * Get read-only views of all host globals, keyed by name, to shadow every host global name as a parameter of the
 * compiled code: assignment to a name (`parseInt = ...`) then only changes the parameter, and writes through a
 * built-in (`JSON.parse = ...`) throw. Hidden globals are `undefined`.
 * @returns {Record<string, unknown>}
 */
export function getReadOnlyHostGlobals(): Record<string, unknown> {
  if (hostGlobals) {
    return hostGlobals;
  }
  hostGlobals = {};
  for (const name of Object.getOwnPropertyNames(globalThis)) {
    if (name === 'eval' || name === 'arguments' || !IDENTIFIER.test(name)) continue;
    hostGlobals[name] =
      HIDDEN_HOST_GLOBALS.has(name) || MODULE_GLOBALS.has(name) ? undefined : readOnly((globalThis as Record<string, unknown>)[name]);
  }
  return hostGlobals;
}
