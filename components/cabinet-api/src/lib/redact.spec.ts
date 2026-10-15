import { redactHeaders, redactUrl, urlPath, REDACTED } from './redact';

describe('redactHeaders', () => {
  it('redacts sensitive headers case-insensitively and keeps others', () => {
    const result = redactHeaders({
      Token: 'jwt',
      AUTHORIZATION: 'Bearer x',
      cookie: 'a=b',
      'Set-Cookie': 'a=b',
      'x-api-key': 'k',
      'user-data': 'u',
      'allow-tokens': 't',
      'user-agent': 'ua',
    });
    expect(result).toEqual({
      Token: REDACTED,
      AUTHORIZATION: REDACTED,
      cookie: REDACTED,
      'Set-Cookie': REDACTED,
      'x-api-key': REDACTED,
      'user-data': REDACTED,
      'allow-tokens': REDACTED,
      'user-agent': 'ua',
    });
  });

  it('does not mutate the original headers', () => {
    const headers = { token: 'jwt', authorization: 'Bearer x', cookie: 'a=b' };
    redactHeaders(headers);
    expect(headers).toEqual({ token: 'jwt', authorization: 'Bearer x', cookie: 'a=b' });
  });

  it('handles empty input', () => {
    expect(redactHeaders(undefined)).toBeUndefined();
  });
});

describe('redactUrl', () => {
  it('masks sensitive query params only', () => {
    expect(redactUrl('/a/b?token=abc&x=1&Access_Token=d&refresh_token=e&code=f&key=g&secret=h')).toBe(
      `/a/b?token=${REDACTED}&x=1&Access_Token=${REDACTED}&refresh_token=${REDACTED}&code=${REDACTED}&key=${REDACTED}&secret=${REDACTED}`,
    );
  });

  it('keeps urls without query and fragments', () => {
    expect(redactUrl('/a/b')).toBe('/a/b');
    expect(redactUrl('/a?token=1#frag')).toBe(`/a?token=${REDACTED}#frag`);
  });

  it('handles encoded names and valueless params', () => {
    expect(redactUrl('/a?%74oken=1&flag')).toBe(`/a?%74oken=${REDACTED}&flag`);
  });
});

describe('urlPath', () => {
  it('strips query and fragment', () => {
    expect(urlPath('/a/b?token=1#x')).toBe('/a/b');
    expect(urlPath('/a/b')).toBe('/a/b');
  });
});
