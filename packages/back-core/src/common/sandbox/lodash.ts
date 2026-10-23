import _, { LoDashStatic } from 'lodash';

import { FORBIDDEN_PROPERTIES } from './compile';

/**
 * A number of lodash helpers resolve a **string (or array) path** at runtime — `_.get`, `_.set`,
 * `_.result`, `_.invoke`, `_.property`, `_.iteratee`, … — so a caller can walk to `constructor` /
 * `prototype` / `__proto__` (and through them to the real `Function` constructor and the host realm)
 * without ever writing a member expression the `Sandbox`'s AST guard could see:
 *
 *     _.get([], 'constructor.constructor')('return process')()
 *
 * This module wraps those helpers so every path argument is checked, and blocks `_.template`, which
 * compiles arbitrary code with the real `Function`. Everything else delegates to lodash unchanged.
 * The wrapper is its own lodash realm (`runInContext`), so overriding these entry points can't
 * affect the host's `_`.
 */

/**
 * Throw if a lodash path contains a segment that would climb the prototype/constructor chain.
 * A string path (`'a.b.c'`, `'a[0].b'`) is split with lodash's own `toPath`; an array path is
 * treated as literal keys. Symbols are always allowed (they can't spell a forbidden name).
 * @param {unknown} path Path argument passed to a lodash helper.
 */
function assertSafePath(path: unknown): void {
  if (path == null) return;
  const segments = Array.isArray(path) ? path : _.toPath(path as string);
  for (const segment of segments) {
    if (typeof segment !== 'symbol' && FORBIDDEN_PROPERTIES.has(String(segment))) {
      throw new Error(`Access to "${String(segment)}" is blocked`);
    }
  }
}

// Own lodash realm so our overrides never touch the host's `_`.
const guardedLodash: LoDashStatic = _.runInContext();
const g = guardedLodash as unknown as Record<string, (...args: any[]) => any>;

/**
 * Wrap a lodash method so the argument at `pathIndex` is validated as a path before delegating.
 * @param {string} name Method name.
 * @param {number} pathIndex Index of the path argument.
 */
function guardPathArg(name: string, pathIndex: number): void {
  const original = g[name];
  g[name] = function (this: unknown, ...args: unknown[]): unknown {
    assertSafePath(args[pathIndex]);
    return original.apply(this, args);
  };
}

// Helpers whose path argument is the second parameter (object/collection first).
for (const name of ['get', 'has', 'hasIn', 'result', 'invoke', 'set', 'setWith', 'update', 'updateWith', 'unset', 'bindKey']) {
  guardPathArg(name, 1);
}

// Helpers whose path argument is the first parameter.
for (const name of ['property', 'method', 'matchesProperty']) {
  guardPathArg(name, 0);
}

// `_.at(object, [paths])` / `_.at(object, ...paths)` — every path (possibly nested arrays) is checked.
const originalAt = g.at;
g.at = function (this: unknown, object: unknown, ...paths: unknown[]): unknown {
  for (const path of _.flattenDeep(paths)) assertSafePath(path);
  return originalAt.apply(this, [object, ...paths]);
};

// `_.invokeMap(collection, path, ...args)` — `path` may be a function (left alone) or a path.
const originalInvokeMap = g.invokeMap;
g.invokeMap = function (this: unknown, collection: unknown, path: unknown, ...args: unknown[]): unknown {
  if (typeof path !== 'function') assertSafePath(path);
  return originalInvokeMap.apply(this, [collection, path, ...args]);
};

// `_.propertyOf(object)` / `_.methodOf(object, ...args)` return a function that takes the path.
const originalPropertyOf = g.propertyOf;
g.propertyOf = function (this: unknown, object: unknown): (path: unknown) => unknown {
  const resolve = originalPropertyOf.call(this, object);
  return (path: unknown) => {
    assertSafePath(path);
    return resolve(path);
  };
};
const originalMethodOf = g.methodOf;
g.methodOf = function (this: unknown, object: unknown, ...args: unknown[]): (path: unknown) => unknown {
  const resolve = originalMethodOf.apply(this, [object, ...args]);
  return (path: unknown) => {
    assertSafePath(path);
    return resolve(path);
  };
};

// `_.iteratee(func)` — a string is a property path; a `[path, value]` array is a matchesProperty shorthand.
const originalIteratee = g.iteratee;
g.iteratee = function (this: unknown, func: unknown): unknown {
  if (typeof func === 'string') assertSafePath(func);
  else if (Array.isArray(func)) assertSafePath(func[0]);
  return originalIteratee.call(this, func);
};

// `_.template` compiles arbitrary code with the real `Function`; there is no path to filter, so deny it.
g.template = function (): never {
  throw new Error('Access to lodash.template is blocked');
};

export { assertSafePath, guardedLodash };
