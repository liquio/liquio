const numerateValue = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(numerateValue);
  }

  if (obj instanceof Object) {
    const record = obj as Record<string, unknown>;
    Object.keys(record).forEach((key) => {
      record[key] = numerateValue(record[key]);
    });
    return record;
  }

  if (typeof obj === 'string' && /^\d+$/.test(obj)) {
    return Number(obj);
  }
  return obj;
};

export default numerateValue;
