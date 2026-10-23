type typeOfValue = 'object' | 'array' | 'string' | 'number' | 'null' | 'undefined' | 'bigint' | 'boolean' | 'set' | 'map' | 'symbol';

export function typeOf(value: unknown): typeOfValue {
  const type = Object.prototype.toString.call(value);
  return type.substring(type.indexOf(' ') + 1, type.indexOf(']')).toLowerCase() as typeOfValue;
}
