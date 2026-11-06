import { describe, expect, it } from 'vitest';
import padWithZeroes from 'helpers/padWithZeroes';

describe('padWithZeroes', () => {
  it('pads a shorter number with leading zeroes', () => {
    expect(padWithZeroes(7, 3)).toBe('007');
  });

  it('leaves a value already at or beyond the target length unchanged', () => {
    expect(padWithZeroes(1234, 3)).toBe('1234');
  });

  it('accepts string input', () => {
    expect(padWithZeroes('42', 4)).toBe('0042');
  });
});
