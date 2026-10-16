import { assertBasicAuthConfig, buildSandboxConfig, validateBasicAuthConfig } from './config_validation';

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
    const result = sandbox.evalWithArgs('() => [typeof process, typeof require, typeof Buffer]', [], { checkArrow: true });
    expect(result).toEqual(['undefined', 'undefined', 'undefined']);
  });
});
