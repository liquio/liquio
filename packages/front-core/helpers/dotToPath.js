import objectPath from 'object-path';

const dotToPath = (obj) => {
  if (typeof obj !== 'object') {
    return obj;
  }

  const newObj = {};

  Object.keys(obj).forEach((key) => {
    objectPath.set(newObj, key, dotToPath(obj[key]));
  });

  return newObj;
};

export default dotToPath;
