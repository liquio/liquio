const numerateValue = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(numerateValue);
  }

  if (obj instanceof Object) {
    Object.keys(obj).forEach((key) => {
      obj[key] = numerateValue(obj[key]);
    });
    return obj;
  }

  if (/^\d+$/.test(obj)) {
    return Number(obj);
  }
  return obj;
};

export default numerateValue;
