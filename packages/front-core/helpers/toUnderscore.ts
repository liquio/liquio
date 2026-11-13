const toUnderscore = (str: string): string =>
  str
    .split(/(?=[A-Z])/)
    .join('_')
    .toLowerCase();

export const toUnderscoreObject = (obj: Record<string, unknown>, deep = true): Record<string, unknown> =>
  Object.keys(obj).reduce<Record<string, unknown>>(
    (acc, key) => ({
      ...acc,
      [toUnderscore(key)]:
        deep && typeof obj[key] === 'object' && obj[key] !== null
          ? toUnderscoreObject(obj[key] as Record<string, unknown>)
          : obj[key]
    }),
    {}
  );

export default toUnderscore;
