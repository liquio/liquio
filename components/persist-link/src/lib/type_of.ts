/**
 * @param {*} value
 * @return {'object'|'array'|'string'|'number'|'null'|'undefined'|'bigint'|'boolean'|'set'|'map'|'symbol'}
 */
const typeOf = (value) => {
  const type = Object.prototype.toString.call(value);
  return type.substring(type.indexOf(' ') + 1, type.indexOf(']')).toLowerCase();
};

export default typeOf;
