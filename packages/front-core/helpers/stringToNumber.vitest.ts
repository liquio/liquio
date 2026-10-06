import { describe, expect, it } from 'vitest';
import stringToNumber from 'helpers/stringToNumber';

describe('stringToNumber', () => {
  it('parses plain numeric strings', () => {
    expect(stringToNumber('42')).toBe(42);
  });

  it('treats a comma as a decimal separator', () => {
    expect(stringToNumber('1,5')).toBe(1.5);
  });

  it('strips non-numeric characters such as currency symbols', () => {
    expect(stringToNumber('$1 234')).toBe(1234);
  });

  it('falls back to 0 for unparsable strings', () => {
    expect(stringToNumber('abc')).toBe(0);
  });

  it('passes numbers through, defaulting falsy values to 0', () => {
    expect(stringToNumber(7)).toBe(7);
    expect(stringToNumber(0)).toBe(0);
    expect(stringToNumber(undefined)).toBe(0);
  });
});
