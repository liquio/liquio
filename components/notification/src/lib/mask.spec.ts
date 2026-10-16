import { maskEmail, maskEmails, maskPhone, maskPhones, redactMessage } from './mask';

describe('mask helpers (NT-10)', () => {
  it('maskPhone keeps only last 2 digits', () => {
    expect(maskPhone('+380501234567')).toBe('***67');
    expect(maskPhone('')).toBe('');
    expect(maskPhone(undefined)).toBe('');
  });
  it('maskPhones masks each', () => {
    expect(maskPhones(['380501234567', '380671112233'])).toEqual(['***67', '***33']);
  });
  it('maskEmail hides local part', () => {
    expect(maskEmail('john.doe@example.com')).toBe('j***@example.com');
    expect(maskEmail('garbage')).toBe('***');
    expect(maskEmail(null)).toBe('');
  });
  it('maskEmails handles list and csv', () => {
    expect(maskEmails(['a@b.c'])).toEqual(['a***@b.c']);
    expect(maskEmails('a@b.c, d@e.f')).toEqual(['a***@b.c', 'd***@e.f']);
  });
  it('redactMessage returns length only', () => {
    expect(redactMessage('secret code 1234')).toBe('[redacted:16]');
    expect(redactMessage(undefined)).toBe('[redacted:0]');
  });
});
