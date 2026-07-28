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
});
