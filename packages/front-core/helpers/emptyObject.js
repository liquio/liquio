export default (obj) =>
  typeof obj === 'object' && Object.keys(obj).length === 0;
