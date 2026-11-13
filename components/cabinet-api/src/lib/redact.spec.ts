import { redactHeaders, redactUrl, safeError, urlPath, REDACTED } from './redact';

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

describe('safeError', () => {
  const axiosLike = () =>
    Object.assign(new Error('Request failed with status code 401'), {
      name: 'AxiosError',
      code: 'ERR_BAD_REQUEST',
      config: { url: '/x', headers: { Authorization: 'Bearer secret-jwt', token: 'secret-token' } },
      request: { _header: 'token: secret-token' },
      response: { status: 401, headers: { 'set-cookie': 'sid=secret' }, data: { token: 'secret-token' } },
    });

  it('keeps only safe fields', () => {
    const result = safeError(axiosLike());
    expect(Object.keys(result).sort()).toEqual(['code', 'message', 'name', 'stack', 'status']);
    expect(result).toMatchObject({ name: 'AxiosError', message: 'Request failed with status code 401', code: 'ERR_BAD_REQUEST', status: 401 });
  });

  it('does not leak headers or tokens', () => {
    const serialized = JSON.stringify(safeError(axiosLike()));
    expect(serialized).not.toContain('secret-jwt');
    expect(serialized).not.toContain('secret-token');
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('Authorization');
  });

  it('prefers own status and handles non-objects', () => {
    expect(safeError(Object.assign(new Error('x'), { status: 404 })).status).toBe(404);
    expect(safeError('boom')).toEqual({ message: 'boom' });
    expect(safeError(undefined)).toEqual({ message: 'undefined' });
  });
});
