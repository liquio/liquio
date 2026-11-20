type AnyRecord = Record<string, unknown>;

const removeEmptyFields = (object: AnyRecord = {}): AnyRecord => {
  const recursiveObj = (obj: AnyRecord): AnyRecord => {
    Object.keys(obj || {}).forEach((key) => {
      if (obj[key] === null) delete obj[key];
      else if (typeof obj[key] === 'object' && obj[key] !== null) recursiveObj(obj[key] as AnyRecord);
    });
    return obj;
  };
  return recursiveObj(object);
};

export default removeEmptyFields;
