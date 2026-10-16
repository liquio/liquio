import { redactHeaders, redactRequestOptions } from './redact_headers';

describe('redactHeaders', () => {
  it('masks token-like headers and keeps the others', () => {
    expect(
      redactHeaders({ token: 'secret', Authorization: 'Bearer x', Cookie: 'a=b', 'x-api-key': 'k', 'Content-Type': 'application/json' }),
    ).toEqual({ token: '***', Authorization: '***', Cookie: '***', 'x-api-key': '***', 'Content-Type': 'application/json' });
  });

  it('does not mutate the input and tolerates missing headers', () => {
    const headers = { token: 'secret' };
    redactHeaders(headers);
    expect(headers.token).toBe('secret');
    expect(redactHeaders(undefined)).toBeUndefined();
  });
});

describe('redactRequestOptions', () => {
  it('never exposes the token and drops the https agent', () => {
    const out = redactRequestOptions({ url: 'u', headers: { token: 'secret' }, httpsAgent: {} } as any);
    expect(JSON.stringify(out)).not.toContain('secret');
    expect(out).toEqual({ url: 'u', headers: { token: '***' }, httpsAgent: undefined });
  });
});
