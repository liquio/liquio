import { describe, expect, it } from 'vitest';
import equilPath from 'helpers/equilPath';

describe('equilPath', () => {
  it('is true for arrays with the same dotted path', () => {
    expect(equilPath(['a', 'b'], ['a', 'b'])).toBe(true);
  });

  it('is false for different paths or missing arrays', () => {
    expect(equilPath(['a', 'b'], ['a', 'c'])).toBe(false);
    expect(equilPath(null, ['a'])).toBe(false);
  });
});
