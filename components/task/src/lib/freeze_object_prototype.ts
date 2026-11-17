// Called by the server entry point once all modules are loaded: with Object.prototype frozen, a
// property-path bug can no longer add or change properties that every object in the process inherits.
// It cannot run before the requires, because moment and other libraries assign `toString` on objects
// that inherit from Object.prototype while loading.
export function freezeObjectPrototype(): void {
  Object.freeze(Object.prototype);
}
