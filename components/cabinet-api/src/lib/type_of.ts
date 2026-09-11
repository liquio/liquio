/**
 * Get the type of a value using Object.prototype.toString
 * @param value - The value to check
 * @returns The type as a lowercase string
 */
export default (
  value: unknown,
): 'object' | 'array' | 'string' | 'number' | 'null' | 'undefined' | 'bigint' | 'boolean' | 'set' | 'map' | 'symbol' => {
  const type = Object.prototype.toString.call(value);
  return type.substring(type.indexOf(' ') + 1, type.indexOf(']')).toLowerCase() as
    | 'object'
    | 'array'
    | 'string'
    | 'number'
    | 'null'
    | 'undefined'
    | 'bigint'
    | 'boolean'
    | 'set'
    | 'map'
    | 'symbol';
};
