const Helpers = require('./helpers');

describe('replaceObjValues', () => {
  it('should replace values in a flat object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const handler = (value) => value * 2;
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual({ a: 2, b: 4, c: 6 });
  });

  it('should replace values in a nested object', () => {
    const obj = { a: 1, b: { c: 2, d: 3 } };
    const handler = (value) => value + 1;
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual({ a: 2, b: { c: 3, d: 4 } });
  });

  it('should replace values in an array', () => {
    const obj = [1, 2, 3];
    const handler = (value) => value * 3;
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual([3, 6, 9]);
  });

  it('should replace values in a nested array', () => {
    const obj = [1, [2, 3], 4];
    const handler = (value) => value - 1;
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual([0, [1, 2], 3]);
  });

  it('should handle mixed objects and arrays', () => {
    const obj = { a: [1, 2], b: { c: 3, d: [4, 5] } };
    const handler = (value) => value * 2;
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual({ a: [2, 4], b: { c: 6, d: [8, 10] } });
  });

  it('should return the same value for non-object and non-array inputs', () => {
    const obj = 42;
    const handler = (value) => value * 2;
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toBe(84);
  });

  it('should handle empty objects and arrays', () => {
    const obj = { a: {}, b: [] };
    const handler = (value) => value;
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual({ a: {}, b: [] });
  });

  it('should handle null and undefined values', () => {
    const obj = { a: null, b: undefined };
    const handler = (value) => (value === null ? 'null' : 'undefined');
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual({ a: 'null', b: 'undefined' });
  });

  it('should handle properties that are functions', () => {
    const obj = { a: 1, b: () => 42 };
    const handler = (value) => (typeof value === 'function' ? value() : value * 2);
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual({ a: 2, b: 42 });
  });
});
