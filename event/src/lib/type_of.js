module.exports = (value) => {
  const type = Object.prototype.toString.call(value);
  return type.substring(type.indexOf(' ') + 1, type.indexOf(']')).toLowerCase();
};
