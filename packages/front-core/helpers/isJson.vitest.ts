import { describe, expect, it } from 'vitest';
import isJson from 'helpers/isJson';

describe('isJson', () => {
  it('is true for valid JSON', () => {
    expect(isJson('{"a":1}')).toBe(true);
    expect(isJson('[1,2,3]')).toBe(true);
  });

  it('is false for invalid JSON', () => {
    expect(isJson('not json')).toBe(false);
  });
});
