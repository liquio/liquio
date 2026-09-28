/**
 * `Object.getOwnPropertyDescriptor(obj, 'constructor')` and `Object.getPrototypeOf(obj)` reach the
 * constructor/prototype chain through a string argument (not a member expression), so the `Sandbox`'s
 * AST guard can't see them:
 *
 *     Object.getOwnPropertyDescriptor(Object.getPrototypeOf([]), 'constructor').value  // → Array
 *
 * `Object` can't simply be shadowed away — evaluated code relies on `keys`/`values`/`assign`/… — so it
 * is exposed as a Proxy that blocks only these reflection methods and forwards everything else
 * (including `Object(x)` and `new Object()`) to the real constructor.
 */

/** `Object` static methods that expose the prototype/constructor chain and are blocked in the sandbox. */
const BLOCKED_OBJECT_METHODS = new Set(['getOwnPropertyDescriptor', 'getPrototypeOf']);

/**
 * A Proxy over the real `Object` constructor that throws when one of the blocked reflection methods is
 * accessed and delegates every other property (and call/construct) to `Object`.
 */
export const guardedObject: ObjectConstructor = new Proxy(Object, {
  get(target, prop, receiver): unknown {
    if (typeof prop === 'string' && BLOCKED_OBJECT_METHODS.has(prop)) {
      return () => {
        throw new Error(`Access to Object.${prop} is blocked`);
      };
    }
    return Reflect.get(target, prop, receiver);
  },
});
