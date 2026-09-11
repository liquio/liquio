const deepObjectFind = (data, findFunc) => {
  if (typeof data !== 'object') {
    return null;
  }

  if (findFunc(data)) {
    return data;
  }

  return Object.values(data)
    .map((prop) => deepObjectFind(prop, findFunc))
    .filter(Boolean)
    .shift();
};

export const deepObjectFindCallback = (data, findFunc, callback) => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  if (findFunc(data)) {
    callback(data);
  }

  return Object.values(data).forEach((prop) =>
    deepObjectFindCallback(prop, findFunc, callback),
  );
};

export const deepObjectFindAll = (data, findFunc) => {
  const result = [];
  deepObjectFindCallback(data, findFunc, result.push.bind(result));
  return result;
};

export const deepFind = (obj, key) => {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const prop = keys[i];
    if (prop === key) {
      return obj[prop];
    }
    if (typeof obj[prop] === 'object') {
      const result = deepFind(obj[prop], key);
      if (result !== undefined) {
        return result;
      }
    }
  }
  return undefined;
};

export default deepObjectFind;
