import { assertAuthConfig, checkAuthConfig } from './auth-config';

const LEGACY_DEFAULT = ['user', 'name:pass', 'word'].join('');

describe('checkAuthConfig', () => {
  it('accepts a random token in production', () => {
    expect(checkAuthConfig({ basicAuthTokens: ['external-reader:Xk29sLq8Zr41Vb7n'] }, 'production')).toEqual([]);
  });

  it('refuses the legacy shipped default in every environment', () => {
    for (const env of ['production', 'prod', 'development', 'test', undefined]) {
      expect(checkAuthConfig({ basicAuthTokens: [LEGACY_DEFAULT] }, env)).toHaveLength(1);
    }
  });

  it('refuses the legacy default listed next to a valid token', () => {
    expect(checkAuthConfig({ basicAuthTokens: ['external-reader:Xk29sLq8Zr41Vb7n', LEGACY_DEFAULT] }, 'test')).toHaveLength(1);
  });

  it('refuses an empty or missing list only in production', () => {
    expect(checkAuthConfig({ basicAuthTokens: [] }, 'production')).toHaveLength(1);
    expect(checkAuthConfig(undefined, 'prod')).toHaveLength(1);
    expect(checkAuthConfig({ basicAuthTokens: [] }, 'development')).toEqual([]);
  });

  it('refuses placeholders, malformed and short-password tokens in production', () => {
    expect(checkAuthConfig({ basicAuthTokens: ['<REDACTED>'] }, 'production')).toHaveLength(1);
    expect(checkAuthConfig({ basicAuthTokens: ['external-reader:<REDACTED>'] }, 'production')).toHaveLength(1);
    expect(checkAuthConfig({ basicAuthTokens: ['external-reader:CHANGEME'] }, 'production')).toHaveLength(1);
    expect(checkAuthConfig({ basicAuthTokens: ['nocolonhere'] }, 'production')).toHaveLength(1);
    expect(checkAuthConfig({ basicAuthTokens: ['external-reader:short'] }, 'production')).toHaveLength(1);
    expect(checkAuthConfig({ basicAuthTokens: [42 as unknown as string] }, 'production')).toHaveLength(1);
  });

  it('does not refuse placeholders outside production (they match no request)', () => {
    expect(checkAuthConfig({ basicAuthTokens: ['<REDACTED>'] }, 'development')).toEqual([]);
  });

  it('never prints the token value', () => {
    expect(() => assertAuthConfig({ basicAuthTokens: [LEGACY_DEFAULT] }, 'production')).toThrow(/auth\.basicAuthTokens\[0\]/);
    try {
      assertAuthConfig({ basicAuthTokens: [LEGACY_DEFAULT] }, 'production');
    } catch (error) {
      expect((error as Error).message).not.toContain(LEGACY_DEFAULT);
    }
  });
});
