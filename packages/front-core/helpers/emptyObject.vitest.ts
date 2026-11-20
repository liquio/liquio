import { describe, expect, it } from 'vitest';
import emptyObject from 'helpers/emptyObject';

describe('emptyObject', () => {
  it('is true for an object with no own keys', () => {
    expect(emptyObject({})).toBe(true);
  });

  it('is false for an object with keys', () => {
    expect(emptyObject({ a: 1 })).toBe(false);
  });

  it('is false for non-objects and null', () => {
    expect(emptyObject(null)).toBe(false);
    expect(emptyObject('text')).toBe(false);
    expect(emptyObject(1)).toBe(false);
  });
});
