type FindFunc = (data: unknown) => boolean;

const deepObjectFind = (data: unknown, findFunc: FindFunc): unknown => {
  if (typeof data !== 'object' || data === null) {
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

export const deepObjectFindCallback = (data: unknown, findFunc: FindFunc, callback: (data: unknown) => void): void => {
  if (!data || typeof data !== 'object') {
    return;
  }

  if (findFunc(data)) {
    callback(data);
  }

  Object.values(data).forEach((prop) => deepObjectFindCallback(prop, findFunc, callback));
};

export const deepObjectFindAll = (data: unknown, findFunc: FindFunc): unknown[] => {
  const result: unknown[] = [];
  deepObjectFindCallback(data, findFunc, result.push.bind(result));
  return result;
};

export const deepFind = (obj: Record<string, unknown>, key: string): unknown => {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const prop = keys[i];
    if (prop === key) {
      return obj[prop];
    }
    if (typeof obj[prop] === 'object' && obj[prop] !== null) {
      const result = deepFind(obj[prop] as Record<string, unknown>, key);
      if (result !== undefined) {
        return result;
      }
    }
  }
  return undefined;
};

export default deepObjectFind;
