import { describeOptions, redact, redactUrl } from './log_redact';

describe('log_redact', () => {
  it('redact masks tokens, passwords and headers deeply without mutating input', () => {
    const input = { fileId: 1, requestOptions: { headers: { token: 'x' }, token: 'y', nested: [{ password: 'z', ok: 1 }] } };
    const out = redact(input);
    expect(JSON.stringify(out)).not.toMatch(/"x"|"y"|"z"/);
    expect(out.requestOptions.nested[0].ok).toBe(1);
    expect(input.requestOptions.token).toBe('y');
  });

  it('describeOptions returns keys only', () => {
    expect(describeOptions({ fileId: 'f', token: 'secret' })).toEqual({ keys: ['fileId', 'token'] });
    expect(describeOptions(undefined)).toBeUndefined();
  });

  it('redactUrl hides the link hash', () => {
    expect(redactUrl('/HASH123')).toBe('/:hash');
    expect(redactUrl('/HASH123/template?x=1')).toBe('/:hash/template?x=1');
    expect(redactUrl('/link/HASH123?convert=true')).toBe('/link/:hash?convert=true');
    expect(redactUrl('/templates/5')).toBe('/templates/5');
    expect(redactUrl('/test/ping')).toBe('/test/ping');
    expect(redactUrl('/monitoring/system')).toBe('/monitoring/system');
  });
});
