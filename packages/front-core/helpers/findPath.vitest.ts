import { describe, expect, it } from 'vitest';
import findPath from 'helpers/findPath';

describe('findPath', () => {
  // Note: the returned path points to the object that CONTAINS the key, not the key itself
  // (preserved as-is from the original implementation).
  it('finds the path to the object containing a nested key', () => {
    expect(findPath({ a: { b: { c: 1 } } }, 'c')).toBe('a.b');
  });

  it('includes array indices in the path', () => {
    expect(findPath({ a: [{ b: 1 }, { c: 1 }] }, 'c')).toBe('a[1]');
  });

  it('returns an empty string when the key is not found', () => {
    expect(findPath({ a: 1 }, 'missing')).toBe('');
  });
});
