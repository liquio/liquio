import { AxiosError } from 'axios';

import { Helpers } from './helpers';

describe('replaceObjValues', () => {
  it('should replace values in a flat object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const handler = (value) => value * 2;
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual({ a: 2, b: 4, c: 6 });
  });

  it('should replace values in a nested object', () => {
    const obj = { a: 1, b: { c: 2, d: 3 } };
    const handler = (value) => value + 1;
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual({ a: 2, b: { c: 3, d: 4 } });
  });

  it('should replace values in an array', () => {
    const obj = [1, 2, 3];
    const handler = (value) => value * 3;
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual([3, 6, 9]);
  });

  it('should replace values in a nested array', () => {
    const obj = [1, [2, 3], 4];
    const handler = (value) => value - 1;
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual([0, [1, 2], 3]);
  });

  it('should handle mixed objects and arrays', () => {
    const obj = { a: [1, 2], b: { c: 3, d: [4, 5] } };
    const handler = (value) => value * 2;
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual({ a: [2, 4], b: { c: 6, d: [8, 10] } });
  });

  it('should return the same value for non-object and non-array inputs', () => {
    const obj = 42;
    const handler = (value) => value * 2;
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toBe(84);
  });

  it('should handle empty objects and arrays', () => {
    const obj = { a: {}, b: [] };
    const handler = (value) => value;
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual({ a: {}, b: [] });
  });

  it('should handle null and undefined values', () => {
    const obj = { a: null, b: undefined };
    const handler = (value) => (value === null ? 'null' : 'undefined');
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual({ a: 'null', b: 'undefined' });
  });

  it('should handle properties that are functions', () => {
    const obj = { a: 1, b: () => 42 };
    const handler = (value) => (typeof value === 'function' ? value() : value * 2);
    const result = Helpers.replaceObjValues(obj, handler);
    expect(result).toEqual({ a: 2, b: 42 });
  });
});

describe('redactHeaders', () => {
  it('masks sensitive headers case-insensitively and keeps others', () => {
    const headers = {
      Authorization: 'Bearer abc',
      COOKIE: 'sid=1',
      'X-Api-Key': 'k',
      Token: 't',
      password: 'p',
      Secret: 's',
      'Proxy-Authorization': 'x',
      Accept: 'json',
    };
    expect(Helpers.redactHeaders(headers)).toEqual({
      Authorization: '****',
      COOKIE: '****',
      'X-Api-Key': '****',
      Token: '****',
      password: '****',
      Secret: '****',
      'Proxy-Authorization': '****',
      Accept: 'json',
    });
    expect(headers.Authorization).toBe('Bearer abc');
  });

  it('returns non-objects as is', () => {
    expect(Helpers.redactHeaders(undefined)).toBeUndefined();
  });
});

describe('redactSensitiveData', () => {
  it('masks sensitive keys in nested objects and arrays', () => {
    expect(Helpers.redactSensitiveData({ a: 1, password: 'p', n: [{ Access_Token: 't', b: 2 }] })).toEqual({
      a: 1,
      password: '****',
      n: [{ Access_Token: '****', b: 2 }],
    });
  });

  it('returns strings as is', () => {
    expect(Helpers.redactSensitiveData('abc')).toBe('abc');
  });
});

describe('escapeCsvCell', () => {
  it.each(['=1+1', '+1', '-1+2', '@SUM(A1)', '\tx', '\rx'])('prefixes formula-like string %j', (value) => {
    const result = Helpers.escapeCsvCell(value);
    expect(result.replace(/^"/, '').startsWith("'")).toBe(true);
  });

  it('prefixes and quotes a cell starting with CR', () => {
    expect(Helpers.escapeCsvCell('\rx')).toBe('"\'\rx"');
  });

  it('prefixes a tab-leading cell without quoting', () => {
    expect(Helpers.escapeCsvCell('\tx')).toBe("'\tx");
  });

  it('prefixes =, + and @ cells', () => {
    expect(Helpers.escapeCsvCell('=1+1')).toBe("'=1+1");
    expect(Helpers.escapeCsvCell('+1')).toBe("'+1");
    expect(Helpers.escapeCsvCell('@x')).toBe("'@x");
    expect(Helpers.escapeCsvCell('-cmd')).toBe("'-cmd");
  });

  it('keeps real numbers unprefixed, including negative ones', () => {
    expect(Helpers.escapeCsvCell(-5)).toBe('-5');
    expect(Helpers.escapeCsvCell(-1.5)).toBe('-1.5');
    expect(Helpers.escapeCsvCell(0)).toBe('0');
    expect(Helpers.escapeCsvCell(BigInt(-7))).toBe('-7');
  });

  it('treats numeric-looking strings as text and prefixes them', () => {
    expect(Helpers.escapeCsvCell('-5')).toBe("'-5");
  });

  it('leaves plain values untouched', () => {
    expect(Helpers.escapeCsvCell('abc')).toBe('abc');
    expect(Helpers.escapeCsvCell('a-b=c')).toBe('a-b=c');
    expect(Helpers.escapeCsvCell(true)).toBe('true');
  });

  it('returns empty string for null and undefined', () => {
    expect(Helpers.escapeCsvCell(null)).toBe('');
    expect(Helpers.escapeCsvCell(undefined)).toBe('');
  });

  it('quotes cells with commas, quotes and line breaks', () => {
    expect(Helpers.escapeCsvCell('a,b')).toBe('"a,b"');
    expect(Helpers.escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(Helpers.escapeCsvCell('a\nb')).toBe('"a\nb"');
    expect(Helpers.escapeCsvCell('a\r\nb')).toBe('"a\r\nb"');
  });

  it('prefixes before quoting when both apply', () => {
    expect(Helpers.escapeCsvCell('=A1,B1')).toBe('"\'=A1,B1"');
  });
});

describe('prepareAxiosErrorToLog (EV-05b)', () => {
  const makeError = (data: any, headers: any = { token: 'hdr-secret', Authorization: 'Basic abc', 'x-trace-id': 't1' }) =>
    new AxiosError('Request failed', 'ERR_BAD_REQUEST', { url: '/x', method: 'get', headers } as any, {}, {
      status: 500,
      statusText: 'ERR',
      data,
      headers: {},
      config: {} as any,
    } as any);

  it('masks secret keys in the response body', () => {
    const result = Helpers.prepareAxiosErrorToLog(
      makeError({ error: 'bad', access_token: 'tok-1', nested: { password: 'p', clientSecret: 's', ok: 1 } }),
    );
    expect(result.responseData).toEqual({ error: 'bad', access_token: '****', nested: { password: '****', clientSecret: '****', ok: 1 } });
    expect(JSON.stringify(result)).not.toMatch(/tok-1|"p"/);
  });

  it('truncates long response bodies', () => {
    const result = Helpers.prepareAxiosErrorToLog(makeError('x'.repeat(100000)));
    expect(result.responseData.length).toBeLessThanOrEqual(2000);
    const objResult = Helpers.prepareAxiosErrorToLog(makeError({ html: 'y'.repeat(100000) }));
    expect(objResult.responseData.html.length).toBeLessThanOrEqual(2000);
  });

  it('keeps empty bodies as {} and drops buffers', () => {
    expect(Helpers.prepareAxiosErrorToLog(makeError(undefined)).responseData).toEqual({});
    expect(Helpers.prepareAxiosErrorToLog(makeError(Buffer.from('secret bytes'))).responseData).toBe('binary');
  });

  it('masks sensitive headers when withHeaders is set and does not leak them otherwise', () => {
    const withHeaders = Helpers.prepareAxiosErrorToLog(makeError({}), { withHeaders: true });
    expect(withHeaders.headers).toEqual({ token: '****', Authorization: '****', 'x-trace-id': 't1' });
    expect(JSON.stringify(Helpers.prepareAxiosErrorToLog(makeError({})))).not.toMatch(/hdr-secret|Basic abc/);
  });
});

describe('sensitive name matching and redactRequestOptions (EV-05b)', () => {
  it('masks token, api-key, signature, cookie, secret and password names', () => {
    const out = Helpers.redactHeaders({
      'X-Service-Token': 'a',
      'api-key': 'b',
      'X-Signature': 'c',
      'Set-Cookie': 'd',
      'x-secret': 'e',
      Accept: 'json',
    });
    expect(out).toEqual({
      'X-Service-Token': '****',
      'api-key': '****',
      'X-Signature': '****',
      'Set-Cookie': '****',
      'x-secret': '****',
      Accept: 'json',
    });
  });

  it('masks headers and body keys, cuts long bodies and drops agents and streams', () => {
    const out = Helpers.redactRequestOptions({
      url: 'http://x',
      headers: { token: 'secret-token' },
      httpsAgent: {},
      data: { password: 'p', big: 'z'.repeat(5000) },
    });
    expect(out.headers.token).toBe('****');
    expect(out.httpsAgent).toBeUndefined();
    expect(out.data.password).toBe('****');
    expect(out.data.big.length).toBeLessThanOrEqual(2000);
    expect(Helpers.redactRequestOptions({ data: Buffer.from('a') }).data).toBe('binary');
    expect(JSON.stringify(out)).not.toContain('secret-token');
  });
});
