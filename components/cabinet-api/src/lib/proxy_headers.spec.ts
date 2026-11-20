import { sanitizeProxyHeaders } from './proxy_headers';

describe('sanitizeProxyHeaders', () => {
  it('removes listed headers regardless of case, keeps others', () => {
    const headers = { 'user-data': 'a', 'User-Data': 'b', 'ALLOW-TOKENS': 'c', accept: 'json' };
    const result = sanitizeProxyHeaders(headers, ['User-Data', 'Allow-Tokens']);
    expect(result).toBe(headers);
    expect(headers).toEqual({ accept: 'json' });
  });

  it('tolerates missing headers', () => {
    expect(sanitizeProxyHeaders(undefined, ['User-Data'])).toBeUndefined();
    expect(sanitizeProxyHeaders(null, ['User-Data'])).toBeNull();
  });
});
