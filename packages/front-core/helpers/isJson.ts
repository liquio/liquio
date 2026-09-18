export default (str: string): boolean => {
  try {
    JSON.parse(str);
  } catch {
    return false;
  }
  return true;
};
