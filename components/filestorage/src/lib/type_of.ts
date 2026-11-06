/**
 * @param {*} value
 * @return {'object'|'array'|'string'|'number'|'null'|'undefined'|'bigint'|'boolean'|'set'|'map'|'symbol'}
 */
export const typeOf = (value: any) => {
  const type = Object.prototype.toString.call(value);
  return type.substring(type.indexOf(' ') + 1, type.indexOf(']')).toLowerCase();
};
