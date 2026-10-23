import { describe, expect, it } from 'vitest';
import getSizeOf from 'helpers/getSizeOf';

describe('getSizeOf', () => {
  it('estimates the byte size of primitives', () => {
    expect(getSizeOf(true)).toBe(4);
    expect(getSizeOf(1)).toBe(8);
    expect(getSizeOf('ab')).toBe(4);
    expect(getSizeOf(undefined)).toBe(0);
  });

  it('sums keys and values recursively for objects', () => {
    expect(getSizeOf({ a: 1 })).toBe(getSizeOf('a') + getSizeOf(1));
  });
});
