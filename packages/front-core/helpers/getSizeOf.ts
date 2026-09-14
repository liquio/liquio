type SizeOfType = 'undefined' | 'boolean' | 'number' | 'string' | 'object';

const typeSizes: Record<SizeOfType, (item?: unknown) => number> = {
  undefined: () => 0,
  boolean: () => 4,
  number: () => 8,
  string: (item) => 2 * (item as string).length,
  object: (item) =>
    !item
      ? 0
      : Object.keys(item as Record<string, unknown>).reduce(
          (total, key) => sizeOf(key) + sizeOf((item as Record<string, unknown>)[key]) + total,
          0
        )
};

const sizeOf = (value: unknown): number => typeSizes[typeof value as SizeOfType](value);

export default sizeOf;
