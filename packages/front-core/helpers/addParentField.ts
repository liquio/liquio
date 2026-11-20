import objectPath from 'object-path';

export default (path: string | Array<string | number> | null | undefined, data: unknown): void => {
  if (!path) return;

  const dataPath = typeof path === 'string' ? path.split('.') : path;

  dataPath.forEach((_e, index) => {
    const itemPath = dataPath.filter((_el, i) => i <= index);
    const itemData = objectPath.get(data, itemPath);
    const isNull = itemData === null || itemData === undefined;

    if (isNull && dataPath[index + 1] !== undefined) {
      objectPath.set(data, itemPath, {});
    }
  });
};
