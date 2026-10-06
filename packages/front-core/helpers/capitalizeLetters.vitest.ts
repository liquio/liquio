import { describe, expect, it } from 'vitest';
import capitalizeLetters from 'helpers/capitalizeLetters';

describe('capitalizeLetters', () => {
  it('capitalizes every word', () => {
    expect(capitalizeLetters('mary jane watson')).toBe('Mary Jane Watson');
  });
});
