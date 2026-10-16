import { assertBasicAuthConfig, validateBasicAuthConfig } from './config_validation';

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
