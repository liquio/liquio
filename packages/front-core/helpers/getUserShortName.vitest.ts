import { describe, expect, it } from 'vitest';
import getUserShortName, { getShortNameFromString } from 'helpers/getUserShortName';

describe('getUserShortName', () => {
  it('abbreviates first and middle names, keeping the full last name', () => {
    expect(getUserShortName({ last_name: 'Петренко', first_name: 'Іван', middle_name: 'Олегович' })).toBe(
      'Петренко І.О.'
    );
  });
});

describe('getShortNameFromString', () => {
  it('parses a "last first middle" string into a short name', () => {
    expect(getShortNameFromString('Петренко Іван Олегович')).toBe('Петренко І.О.');
  });

  it('returns the input unchanged when it is not exactly three parts', () => {
    expect(getShortNameFromString('Петренко')).toBe('Петренко');
  });
});
