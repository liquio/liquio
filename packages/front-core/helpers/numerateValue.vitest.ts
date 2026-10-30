import { describe, expect, it } from 'vitest';
import numerateValue from 'helpers/numerateValue';

describe('numerateValue', () => {
  it('converts numeric-looking strings to numbers, recursively', () => {
    expect(numerateValue({ a: '1', b: ['2', '3'], c: 'text' })).toEqual({ a: 1, b: [2, 3], c: 'text' });
  });

  it('passes non-numeric scalars through', () => {
    expect(numerateValue('abc')).toBe('abc');
    expect(numerateValue(null)).toBeNull();
  });
});
