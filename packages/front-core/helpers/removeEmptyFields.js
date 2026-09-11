const removeEmptyFields = (object = {}) => {
  const recursiveObj = (obj) => {
    (Object.keys(obj) || []).forEach((key) => {
      if (obj[key] === null) delete obj[key];
      if (typeof obj[key] === 'object') recursiveObj(obj[key]);
    });
    return obj;
  };
  return recursiveObj(object);
};

export default removeEmptyFields;
