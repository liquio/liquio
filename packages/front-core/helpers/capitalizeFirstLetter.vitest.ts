import { describe, expect, it } from 'vitest';
import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

describe('capitalizeFirstLetter', () => {
  it('capitalizes each hyphen-separated part by default', () => {
    expect(capitalizeFirstLetter('mary-jane')).toBe('Mary-Jane');
  });

  it('capitalizes only the first character when onlyFirst is set', () => {
    expect(capitalizeFirstLetter('mary-jane', true)).toBe('Mary-jane');
  });

  it('handles an empty or missing value', () => {
    expect(capitalizeFirstLetter('')).toBe('');
  });
});
