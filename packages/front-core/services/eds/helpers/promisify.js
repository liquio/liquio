export default (func) => (args) =>
  new Promise((resolve, reject) => func(...(args || []), resolve, reject));
