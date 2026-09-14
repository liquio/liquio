import { describe, expect, it } from 'vitest';
import userName, { formatUserName } from 'helpers/userName';

describe('userName', () => {
  it('joins and capitalizes last/first/middle names', () => {
    expect(userName({ last_name: 'петренко', first_name: 'іван', middle_name: 'олегович' })).toBe(
      'Петренко Іван Олегович'
    );
  });

  it('uses the company name for legal entities', () => {
    expect(userName({ isLegal: true, companyName: 'Acme LLC' })).toBe('Acme LLC');
  });
});

describe('formatUserName', () => {
  it('capitalizes each word of a multi-word name', () => {
    expect(formatUserName('петренко іван')).toBe('Петренко Іван');
  });

  it('capitalizes a single-word name', () => {
    expect(formatUserName('петренко')).toBe('Петренко');
  });
});
