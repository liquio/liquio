import {
  assertTestAuthConfig,
  validateTestAuthConfig,
  assertBasicAuthConfig,
  buildSandboxConfig,
  validateBasicAuthConfig,
} from './config_validation';

const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString('base64')}`;
// The token that used to be committed to config-templates, built here to keep the literal out of the sources.
const OLD_DEFAULT_TOKEN = basic(['task', 'task'].join(':'));

describe('validateBasicAuthConfig', () => {
  it('should accept a random token', () => {
    expect(validateBasicAuthConfig({ basic_auth: { tokens: [basic('admin-api:Zk3p9QwLm2Xv8Rt')] } }, 'production')).toEqual([]);
  });

  it('should refuse the old default token, with or without the Basic prefix', () => {
    expect(validateBasicAuthConfig({ basic_auth: { tokens: [OLD_DEFAULT_TOKEN] } }, 'test')).toHaveLength(1);
    expect(validateBasicAuthConfig({ basic_auth: { tokens: [OLD_DEFAULT_TOKEN.slice(6)] } }, 'test')).toHaveLength(1);
  });

  it('should refuse a default token next to a valid one', () => {
    const problems = validateBasicAuthConfig({ basic_auth: { tokens: [basic('a:b1'), OLD_DEFAULT_TOKEN] } }, 'test');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('tokens[1]');
  });

  it('should refuse user:user and malformed tokens', () => {
    expect(validateBasicAuthConfig({ basic_auth: { tokens: [basic('user:user')] } }, 'test')).toHaveLength(1);
    expect(validateBasicAuthConfig({ basic_auth: { tokens: [basic('nopassword')] } }, 'test')).toHaveLength(1);
    expect(validateBasicAuthConfig({ basic_auth: { tokens: [42] } }, 'test')).toHaveLength(1);
  });

  it('should refuse an empty list only in production', () => {
    expect(validateBasicAuthConfig({ basic_auth: { tokens: [] } }, 'production')).toHaveLength(1);
    expect(validateBasicAuthConfig({ basic_auth: { tokens: [] } }, 'jest')).toEqual([]);
  });

  it('should refuse a missing tokens list', () => {
    expect(validateBasicAuthConfig({}, 'jest')).toHaveLength(1);
  });
});

describe('assertBasicAuthConfig', () => {
  it('should throw on the old default token', () => {
    expect(() => assertBasicAuthConfig({ basic_auth: { tokens: [OLD_DEFAULT_TOKEN] } }, 'production')).toThrow(/publicly known/);
  });

  it('should not throw on a valid config', () => {
    expect(() => assertBasicAuthConfig({ basic_auth: { tokens: [basic('admin-api:Zk3p9QwLm2Xv8Rt')] } }, 'production')).not.toThrow();
  });
});

describe('buildSandboxConfig', () => {
  it('should default to isolated-vm without a warning', () => {
    const warn = jest.fn();
    expect(buildSandboxConfig(undefined, warn)).toEqual({ isolationLevel: 'isolated-vm' });
    expect(buildSandboxConfig({ isolationLevel: 'isolated-vm', x: 1 }, warn)).toEqual({ isolationLevel: 'isolated-vm', x: 1 });
    expect(warn).not.toHaveBeenCalled();
  });

  it('should override the function isolation level and log a warning', () => {
    const warn = jest.fn();
    expect(buildSandboxConfig({ isolationLevel: 'function', other: 1 }, warn)).toEqual({ isolationLevel: 'isolated-vm', other: 1 });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('sandbox-unsafe-function-level'));
  });

  it('should make a Sandbox built from it unable to reach host globals', () => {
    const { Sandbox } = require('@liquio/back-core');
    const getLog = () => ({ save: jest.fn() });
    const sandbox = new Sandbox({ ...buildSandboxConfig({ isolationLevel: 'function' }, jest.fn()), getLog });
    // The isolate has its own `Buffer` (the `buffer` package): a Uint8Array without the host-only internals such as `utf8Write`.
    const result = sandbox.evalWithArgs(
      '() => { const buffer = Buffer.from("a"); return [typeof process, typeof require, buffer instanceof Uint8Array, typeof buffer.utf8Write]; }',
      [],
      { checkArrow: true },
    );
    expect(result).toEqual(['undefined', 'undefined', true, 'undefined']);
  });
});

describe('assertDownloadTokenConfig', () => {
  const { assertDownloadTokenConfig } = require('./config_validation');

  it('should accept a random secret', () => {
    expect(() => assertDownloadTokenConfig({ download_token: { jwtSecret: 'Zk3p9QwLm2Xv8RtYh5Nc7Bd1' } })).not.toThrow();
  });

  it.each([undefined, '', '<removed>', '<REDACTED>', 'REDACTED', 'changeme', 'short'])('should refuse %p', (jwtSecret) => {
    expect(() => assertDownloadTokenConfig({ download_token: { jwtSecret } })).toThrow('Invalid download_token config');
  });

  it('should refuse a missing section', () => {
    expect(() => assertDownloadTokenConfig({})).toThrow('Invalid download_token config');
  });
});

describe('test auth bypass config', () => {
  const token = 'test-user-token-0123456789';
  const users = { list: [{ token, user: { userId: '1' } }] };

  it('should refuse allowedTestAuth in production without override', () => {
    const config = { auth: { allowedTestAuth: true }, test_users: users };
    expect(() => assertTestAuthConfig(config, 'production', undefined)).toThrow('allowedTestAuth');
    expect(() => assertTestAuthConfig({ auth: { allowedTestAuth: true } }, 'production', undefined)).toThrow();
  });

  it('should refuse allowedTestSign and allowedTestPem with test users in production', () => {
    expect(() => assertTestAuthConfig({ auth: { allowedTestSign: true }, test_users: users }, 'production', undefined)).toThrow();
    expect(() => assertTestAuthConfig({ auth: { allowedTestPem: true }, test_users: users }, 'production', undefined)).toThrow();
  });

  it('should accept the template defaults in production (allowedTestPem without test users is inert)', () => {
    const config = { auth: { allowedTestAuth: false, allowedTestSign: false, allowedTestPem: true } };
    expect(() => assertTestAuthConfig(config, 'production', undefined)).not.toThrow();
  });

  it('should allow production with an explicit override and warn', () => {
    const warn = jest.fn();
    assertTestAuthConfig({ auth: { allowedTestAuth: true }, test_users: users }, 'production', 'true', warn);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('should allow mock auth outside production', () => {
    expect(() => assertTestAuthConfig({ auth: { allowedTestAuth: true }, test_users: users }, 'test', undefined)).not.toThrow();
  });

  it('should refuse short and placeholder test tokens when enabled', () => {
    const bad = (t: any) => ({ auth: { allowedTestAuth: true }, test_users: { list: [{ token: t }] } });
    expect(validateTestAuthConfig(bad('short'), 'test', undefined).problems).toHaveLength(1);
    expect(validateTestAuthConfig(bad('<REDACTED-REDACTED>'), 'test', undefined).problems).toHaveLength(1);
    expect(validateTestAuthConfig(bad(undefined), 'test', undefined).problems).toHaveLength(1);
  });

  it('should not check tokens when no flag is enabled', () => {
    expect(
      validateTestAuthConfig({ auth: { allowedTestAuth: false }, test_users: { list: [{ token: 'x' }] } }, 'production', undefined).problems,
    ).toEqual([]);
  });
});
