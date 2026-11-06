import { TestApp } from './test-app';
import { sensitiveReplace } from '../src/lib/log/helpers/sensitiveReplace';

describe('Log redaction', () => {
  beforeEach(() => TestApp.beforeEach());
  afterEach(() => TestApp.afterEach());

  it('masks sensitive JSON values', () => {
    const result = sensitiveReplace(JSON.stringify({ password: 'fake-pass', access_token: 'fake-token', name: 'visible' }));

    expect(result).not.toContain('fake-pass');
    expect(result).not.toContain('fake-token');
    expect(result).toContain('visible');
    expect(result).toContain('****');
  });

  it('masks sensitive escaped JSON values', () => {
    const result = sensitiveReplace(JSON.stringify({ body: JSON.stringify({ client_secret: 'fake-secret', a: 'ok' }) }));

    expect(result).not.toContain('fake-secret');
    expect(result).toContain('ok');
  });

  it('masks sensitive query and form parameters', () => {
    const result = sensitiveReplace('grant_type=x&client_secret=fake-secret&password=fake-pass&keep=1');

    expect(result).not.toContain('fake-secret');
    expect(result).not.toContain('fake-pass');
    expect(result).toContain('keep=1');
  });

  it('masks custom params with a custom mask', () => {
    const result = sensitiveReplace('{"custom":"fake-value","other":"v"}', ['custom'], '###');

    expect(result).toContain('###');
    expect(result).not.toContain('fake-value');
  });

  it('uses only custom params when defaults are disabled', () => {
    expect(sensitiveReplace('{"password":"fake-pass"}', [], '****', { disableDefaults: true })).toBe('{"password":"fake-pass"}');
    expect(sensitiveReplace('{"password":"fake-pass","x":"y"}', ['x'], '****', { disableDefaults: true })).toContain('fake-pass');
  });

  it('returns non-string input as is', () => {
    const obj = { password: 'fake-pass' };

    expect(sensitiveReplace(obj)).toBe(obj);
  });
});
