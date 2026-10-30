import { maskEmail, maskEmails, maskPhone, maskPhones, redactMessage, redactUrl, summarizeError } from './mask';

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

describe('summarizeError / redactUrl (NT-10b)', () => {
  const axiosError: any = Object.assign(new Error('Request failed with status code 500'), {
    code: 'ERR_BAD_RESPONSE',
    response: { status: 500, data: 'body with 380501234567' },
    config: {
      method: 'post',
      url: 'https://user:pw@sms.example.com/Subscribe/SendSmsQ.php?token=SECRET#frag',
      headers: { Authorization: 'Bearer SECRET-TOKEN' },
      form: { tel: ['380501234567'], text: 'SECRET-OTP' },
    },
  });

  it('keeps message, code, status, method and a credential-free URL', () => {
    expect(summarizeError(axiosError)).toEqual({
      message: 'Request failed with status code 500',
      code: 'ERR_BAD_RESPONSE',
      status: 500,
      method: 'POST',
      url: 'https://sms.example.com/Subscribe/SendSmsQ.php',
    });
  });

  it('leaks no config, headers, phone or text', () => {
    const dump = JSON.stringify(summarizeError(axiosError));
    for (const secret of ['SECRET', '380501234567', 'pw@', 'Bearer', 'token=']) expect(dump).not.toContain(secret);
  });

  it('handles non-error values and relative URLs', () => {
    expect(summarizeError('boom')).toEqual({ message: 'boom' });
    expect(summarizeError(undefined)).toEqual({ message: 'undefined' });
    expect(redactUrl('/a/b?x=1')).toBe('/a/b');
    expect(redactUrl('//u:p@host/a?x=1')).toBe('//host/a');
  });
});
