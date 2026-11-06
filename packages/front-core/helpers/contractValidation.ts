export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertRecord(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(`${label} must be an object`);
}

export function assertOptionalFields(
  value: Record<string, unknown>,
  fields: readonly string[],
  type: 'string' | 'boolean' | 'number',
  label: string,
  nullable = false,
): void {
  for (const field of fields) {
    const item = value[field];
    if (item === undefined || (nullable && item === null)) continue;
    if (
      typeof item !== type ||
      (typeof item === 'number' && !Number.isFinite(item))
    ) {
      throw new TypeError(
        `${label}.${field} must be ${type}${nullable ? ' or null' : ''}`,
      );
    }
  }
}
