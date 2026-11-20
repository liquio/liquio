// Called by BpmnTaskCore.init() once the application is set up, before the message queue consumption
// starts and the HTTP server listens: with Object.prototype frozen, a property-path bug can no longer
// add or change properties that every object in the process inherits.
// It cannot run earlier, because moment, cookiejar and other libraries assign `toString` or similar on
// objects that inherit from Object.prototype while loading or initializing.
export function freezeObjectPrototype(): void {
  Object.freeze(Object.prototype);
}
