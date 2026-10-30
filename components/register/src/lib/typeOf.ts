export type TypeOfValue = 'object' | 'array' | 'string' | 'number' | 'null' | 'undefined' | 'bigint' | 'boolean' | 'set' | 'map' | 'symbol';

export default function typeOf(value: unknown): TypeOfValue {
  const type = Object.prototype.toString.call(value);
  return type.substring(type.indexOf(' ') + 1, type.indexOf(']')).toLowerCase();
}
