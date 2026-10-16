import { sensitiveReplace } from './sensitiveReplace';

describe('sensitiveReplace', () => {
  it('returns non-string input unchanged', () => {
    const input: any = { foo: 'bar' };

    expect(sensitiveReplace(input)).toBe(input);
  });

  it('returns the original string when there is nothing to mask', () => {
    const input = JSON.stringify({ foo: 'bar' });

    expect(sensitiveReplace(input, ['password'])).toBe(input);
  });

  it('masks the configured property', () => {
    const input = JSON.stringify({ password: 'secret', foo: 'bar' });

    const result = sensitiveReplace(input, ['password']);

    expect(result).toContain('"password":"****"');
    expect(result).not.toContain('secret');
    expect(result).toContain('"foo":"bar"');
  });

  it('masks multiple configured properties', () => {
    const input = JSON.stringify({ password: 'secret', token: 'abc' });

    const result = sensitiveReplace(input, ['password', 'token']);

    expect(result).not.toContain('secret');
    expect(result).not.toContain('abc');
  });

  it('supports a custom replacement mask', () => {
    const input = JSON.stringify({ password: 'secret' });

    const result = sensitiveReplace(input, ['password'], '[hidden]');

    expect(result).toContain('[hidden]');
    expect(result).not.toContain('secret');
  });

  it('masks query-string parameters when the excluded name ends with "="', () => {
    const input = JSON.stringify({ url: 'https://example.com/auth?client_id=abc&client_secret=super-secret&other=1' });

    const result = sensitiveReplace(input, ['client_secret=']);

    expect(result).not.toContain('super-secret');
    expect(result).toContain('client_secret=****');
    expect(result).toContain('client_id=abc');
    expect(result).toContain('other=1');
  });

  it('masks both JSON fields and query-string parameters together', () => {
    const input = JSON.stringify({ password: 'secret', url: 'https://example.com?_token=xyz&keep=1' });

    const result = sensitiveReplace(input, ['password', '_token=']);

    expect(result).not.toContain('"secret"');
    expect(result).not.toContain('xyz');
    expect(result).toContain('_token=****');
    expect(result).toContain('keep=1');
  });

  describe('built-in defaults', () => {
    const mask = (obj: unknown, ...rest: any[]) => sensitiveReplace(JSON.stringify(obj), ...(rest as [any]));

    it('masks default keys with no config at all', () => {
      const result = mask({ password: 'p1', token: 't1', secret: 's1', authorization: 'Bearer abc', cookie: 'sid=1', pin: '1234', otp: '555111' });

      ['p1', 't1', 's1', 'Bearer abc', 'sid=1', '1234', '555111'].forEach((v) => expect(result).not.toContain(v));
    });

    it('extends rather than replaces: config entries add to the defaults', () => {
      const result = mask({ password: 'p1', customField: 'c1', foo: 'bar' }, ['customField']);

      expect(result).not.toContain('p1');
      expect(result).not.toContain('c1');
      expect(result).toContain('"foo":"bar"');
    });

    it('matches case-insensitively across snake_case, camelCase and kebab-case', () => {
      const keys = [
        'access_token',
        'accessToken',
        'ACCESS_TOKEN',
        'Access-Token',
        'refresh_token',
        'refreshToken',
        'client_secret',
        'clientSecret',
        'api_key',
        'apiKey',
        'apikey',
        'x-api-key',
        'newPassword',
        'Authorization',
        'COOKIE',
        'Signature',
        'sign',
      ];
      const result = mask(Object.fromEntries(keys.map((k) => [k, 'VALUE'])));

      expect(result).not.toContain('VALUE');
    });

    it('masks values of any JSON type, including nested objects and arrays', () => {
      const result = mask({ token: 12345, secret: true, password: { a: 'x"y', b: [1, { c: 2 }] }, pin: ['9', '8'], ok: 'keep', after: 1 });

      expect(JSON.parse(result)).toEqual({ token: '****', secret: '****', password: '****', pin: '****', ok: 'keep', after: 1 });
    });

    it('masks sensitive keys deep inside non-sensitive objects', () => {
      const result = mask({ data: { req: { headers: { Authorization: 'Bearer zzz', accept: 'json' }, body: { user: { passWord: 'pw' } } } } });

      expect(result).not.toContain('zzz');
      expect(result).not.toContain('pw"');
      expect(result).toContain('"accept":"json"');
    });

    it('masks handled keys with escaped quotes and brackets inside string values', () => {
      const result = mask({ password: 'a\\"},{"b":"c', next: 'ok' });

      expect(JSON.parse(result)).toEqual({ password: '****', next: 'ok' });
    });

    it('masks sensitive keys in JSON embedded in a string value', () => {
      const result = mask({ body: JSON.stringify({ password: 'embedded', n: 1 }) });

      expect(result).not.toContain('embedded');
      expect(JSON.parse(JSON.parse(result).body)).toEqual({ password: '****', n: 1 });
    });

    it('does not mask look-alike keys', () => {
      const input = { design: 'd', shipping: 's', tokenType: 'bearer', statusCode: 500, errorCode: 'E1', pinned: 'p', signal: 'x', expires_in: 3600 };

      expect(JSON.parse(mask(input))).toEqual(input);
    });

    it('masks confirmation codes but keeps error/status codes', () => {
      const masked = JSON.parse(mask({ sms_code: 'ABCD', confirmationCode: 1234, otpCode: 'x1', code: '123456', nested: { code: '4/0AX4XfWh' } }));
      expect(masked).toEqual({ sms_code: '****', confirmationCode: '****', otpCode: '****', code: '****', nested: { code: '****' } });

      const kept = { code: 'ECONNREFUSED', err: { code: 404 }, other: { code: 'ERR_INVALID_ARG_TYPE' } };
      expect(JSON.parse(mask(kept))).toEqual(kept);
    });

    it('masks query parameters in URLs, including the first one and in any string', () => {
      const result = mask({
        url: 'https://h/cb?code=abc123&state=s1&access_token=TOKVAL&refreshToken=r&client_secret=cs&keep=1#frag',
        form: 'grant_type=password&password=pw&username=u',
      });

      ['abc123', 'TOKVAL', '=r&', '=cs&', '=pw&'].forEach((v) => expect(result).not.toContain(v));
      expect(result).toContain('state=s1');
      expect(result).toContain('keep=1#frag');
      expect(result).toContain('username=u');
      expect(result).toContain('grant_type=password');
    });

    it('does not break base64 padding or empty query values', () => {
      const input = { a: 'dGVzdA==', url: 'https://h/?token=&x=1' };

      expect(JSON.parse(mask(input))).toEqual(input);
    });

    it('opt-out: disableDefaults leaves only configured keys masked', () => {
      const input = JSON.stringify({ password: 'p1', custom: 'c1' });

      const result = sensitiveReplace(input, ['custom'], '****', { disableDefaults: true });

      expect(result).toContain('p1');
      expect(result).not.toContain('c1');
      expect(sensitiveReplace(input, [], '****', { disableDefaults: true })).toBe(input);
    });

    it('treats non-identifier config entries as regex on the raw key', () => {
      const result = mask({ card_number: '4111', cvv: '1', other: 'o' }, ['card_.*', 'cvv']);

      expect(JSON.parse(result)).toEqual({ card_number: '****', cvv: '****', other: 'o' });
    });

    it('is fast enough for per-log-line use', () => {
      const line = JSON.stringify({ data: Array.from({ length: 500 }, (_, i) => ({ id: i, name: `n${i}`, token: `t${i}`, nested: { a: 1 } })) });
      const start = Date.now();
      for (let i = 0; i < 20; i++) sensitiveReplace(line, ['x']);

      expect((Date.now() - start) / 20).toBeLessThan(50);
    });
  });
});
