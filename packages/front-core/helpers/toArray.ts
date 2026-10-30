export default (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  try {
    return JSON.parse(value as string);
  } catch {
    return [];
  }
};
