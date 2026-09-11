import objectPath from 'object-path';

export default (path, data) => {
  if (!path) return;

  const dataPath = typeof path === 'string' ? path.split('.') : path;

  dataPath.forEach((e, index) => {
    const itemPath = dataPath.filter((el, i) => i <= index);
    const itemData = objectPath.get(data, itemPath);
    const isNull = itemData === null || itemData === undefined;

    if (isNull && dataPath[index + 1]) {
      objectPath.set(data, itemPath, {});
    }
  });
};
