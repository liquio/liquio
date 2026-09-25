import { describe, expect, it } from 'vitest';
import dotToPath from 'helpers/dotToPath';

describe('dotToPath', () => {
  it('expands dotted keys into a nested object', () => {
    expect(dotToPath({ 'a.b.c': 1, 'a.b.d': 2 })).toEqual({ a: { b: { c: 1, d: 2 } } });
  });

  it('returns non-object input unchanged', () => {
    expect(dotToPath('text')).toBe('text');
    expect(dotToPath(5)).toBe(5);
    expect(dotToPath(null)).toBeNull();
  });

  it('recurses into nested object values', () => {
    expect(dotToPath({ 'a.b': { 'c.d': 1 } })).toEqual({ a: { b: { c: { d: 1 } } } });
  });
});
