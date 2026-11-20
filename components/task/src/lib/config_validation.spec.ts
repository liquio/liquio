import { buildSandboxConfig, checkDownloadTokenSecret, findTestAuthWarnings } from './config_validation';

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

describe('checkDownloadTokenSecret', () => {
  it('should accept a random secret', () => {
    expect(checkDownloadTokenSecret('Zk3p9QwLm2Xv8RtYh5Nc7Bd1')).toBeNull();
  });

  it.each([undefined, '', '<removed>', '<REDACTED>', 'REDACTED', 'changeme', 'short'])('should refuse %p', (secret) => {
    expect(checkDownloadTokenSecret(secret)).toContain('download_token.jwtSecret');
  });
});

describe('findTestAuthWarnings', () => {
  const users = { list: [{ token: 'test-user-token-0123456789' }] };

  it('should warn when test auth is allowed in production by the override', () => {
    const warnings = findTestAuthWarnings({ auth: { allowedTestAuth: true }, test_users: users }, 'production', 'true');
    expect(warnings).toEqual(['test-auth-in-production: auth.allowedTestAuth enabled via ALLOW_TEST_AUTH_IN_PRODUCTION']);
  });

  it('should not warn without the override, outside production or when disabled', () => {
    expect(findTestAuthWarnings({ auth: { allowedTestAuth: true }, test_users: users }, 'production', undefined)).toEqual([]);
    expect(findTestAuthWarnings({ auth: { allowedTestAuth: true }, test_users: users }, 'test', 'true')).toEqual([]);
    expect(findTestAuthWarnings({ auth: { allowedTestPem: true } }, 'production', 'true')).toEqual([]);
  });
});
