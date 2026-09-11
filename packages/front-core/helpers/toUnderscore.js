const toUnderscore = (str) =>
  str
    .split(/(?=[A-Z])/)
    .join('_')
    .toLowerCase();

export const toUnderscoreObject = (obj, deep = true) =>
  Object.keys(obj).reduce(
    (acc, key) => ({
      ...acc,
      [toUnderscore(key)]:
        deep && typeof obj[key] === 'object'
          ? toUnderscoreObject(obj[key])
          : obj[key],
    }),
    {},
  );

export default toUnderscore;
