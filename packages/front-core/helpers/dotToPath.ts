import objectPath from 'object-path';

const dotToPath = (obj: unknown): unknown => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const newObj = {};

  Object.keys(obj).forEach((key) => {
    objectPath.set(newObj, key, dotToPath((obj as Record<string, unknown>)[key]));
  });

  return newObj;
};

export default dotToPath;
