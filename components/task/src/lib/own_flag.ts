/**
 * Reads a boolean option only when the object defines it itself, so a value inherited from a
 * polluted prototype never switches a trusted code path on.
 */
export function ownFlag(object: unknown, key: string, defaultValue = false): boolean {
  if (object === null || typeof object !== 'object' || !Object.prototype.hasOwnProperty.call(object, key)) {
    return defaultValue;
  }
  return !!(object as Record<string, unknown>)[key];
}

/** Returns the own value of `key`, or `defaultValue` when the object doesn't define it itself. */
export function ownValue<T>(object: unknown, key: string, defaultValue: T): T {
  if (object === null || typeof object !== 'object' || !Object.prototype.hasOwnProperty.call(object, key)) {
    return defaultValue;
  }
  const value = (object as Record<string, unknown>)[key];
  return typeof value === 'undefined' ? defaultValue : (value as T);
}
