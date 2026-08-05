export default (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (e) {
    return [];
  }
};
