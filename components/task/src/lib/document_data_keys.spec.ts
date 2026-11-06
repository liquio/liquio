import { isUnsafeDataKey, isUnsafePathSegment, findUnsafeDataKeys } from './document_data_keys';

describe('document_data_keys', () => {
  describe('isUnsafePathSegment', () => {
    it('detects prototype names only', () => {
      expect(isUnsafePathSegment('__proto__')).toBe(true);
      expect(isUnsafePathSegment('constructor')).toBe(true);
      expect(isUnsafePathSegment('prototype')).toBe(true);
      expect(isUnsafePathSegment('firstName')).toBe(false);
    });
  });

  describe('isUnsafeDataKey', () => {
    it.each([
      '__proto__',
      'constructor',
      'prototype',
      'a}|$|{b',
      'a}|^|{b',
      '{x}',
      '<x>',
      'a"b',
      "a'b",
      'a`b',
      'a$b',
      'a^b',
      'a|b',
      'a\\b',
      'a\nb',
      'a\u0000b',
      'x'.repeat(257),
    ])('rejects %j', (key) => {
      expect(isUnsafeDataKey(key)).toBe(true);
    });

    it.each(['firstName', '_id', 'прізвище', 'item-1', '161011', 'x'.repeat(256), '', 'a.b', 'a b'])('accepts %j', (key) => {
      expect(isUnsafeDataKey(key)).toBe(false);
    });
  });

  describe('findUnsafeDataKeys', () => {
    it('returns empty for primitives', () => {
      expect(findUnsafeDataKeys('x', 'p')).toEqual([]);
      expect(findUnsafeDataKeys(1, 'p')).toEqual([]);
      expect(findUnsafeDataKeys(null, 'p')).toEqual([]);
      expect(findUnsafeDataKeys(undefined, 'p')).toEqual([]);
    });

    it('detects the PoC key', () => {
      expect(findUnsafeDataKeys({ 'a}|$|{b': '<iframe>' }, 'ssrfread')).toEqual(['ssrfread.a}|$|{b']);
    });

    it('walks objects in arrays', () => {
      expect(findUnsafeDataKeys({ list: [{ ok: 1 }, { 'bad{': 1 }] }, 'step')).toEqual(['step.list.1.bad{']);
      expect(findUnsafeDataKeys({ list: [{ 'bad{': 1 }] }, 'step')).toEqual(['step.list.0.bad{']);
    });

    it('detects own __proto__ from JSON.parse', () => {
      expect(findUnsafeDataKeys(JSON.parse('{"__proto__":{"x":1}}'), 'p')).toEqual(['p.__proto__']);
    });

    it('reports too deep nesting once without throwing', () => {
      let deep: any = { a: 1 };
      for (let i = 0; i < 65; i++) deep = { a: deep };
      const result = findUnsafeDataKeys(deep, 'p');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatch(/\(too deep\)$/);
    });

    it('limits results', () => {
      const obj: Record<string, number> = {};
      for (let i = 0; i < 20; i++) obj[`bad{${i}`] = 1;
      expect(findUnsafeDataKeys(obj, 'p')).toHaveLength(10);
    });

    it('never contains values and truncates long keys', () => {
      const result = findUnsafeDataKeys({ 'x{': 'SECRET', ['y'.repeat(100) + '{']: 'SECRET' }, 'p');
      expect(JSON.stringify(result)).not.toContain('SECRET');
      expect(result[1].length).toBeLessThanOrEqual('p.'.length + 65);
    });
  });
});
