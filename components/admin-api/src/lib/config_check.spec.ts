import { assertNoPlaceholderSecrets, findPlaceholderSecrets } from './config_check';

const buildConfig = (environment: string, overrides: Record<string, any> = {}) => ({
  server: { environment, token: 'tok', crypto: { password: 'pwd', iv: 'iv' } },
  notifier: { password: 'secret' },
  ...overrides,
});

describe('config_check', () => {
  it('passes with real secrets in any environment', () => {
    expect(findPlaceholderSecrets(buildConfig('production'))).toEqual([]);
    expect(() => assertNoPlaceholderSecrets(buildConfig('production'))).not.toThrow();
  });

  it('throws outside dev for placeholder notifier password', () => {
    const config = buildConfig('production', { notifier: { password: '<REDACTED>' } });
    expect(() => assertNoPlaceholderSecrets(config)).toThrow(/notifier\.password/);
  });

  it('throws outside dev for empty or missing secrets', () => {
    const config = buildConfig('stage', { server: { environment: 'stage', token: '', crypto: { password: '<REDACTED>' } } });
    expect(() => assertNoPlaceholderSecrets(config)).toThrow(/server\.token, server\.crypto\.password, server\.crypto\.iv/);
  });

  it('throws when environment is not set', () => {
    const config = buildConfig('', { notifier: { password: '<REDACTED>' } });
    delete (config.server as any).environment;
    expect(() => assertNoPlaceholderSecrets(config)).toThrow();
  });

  it('allows placeholders in dev and reports them', () => {
    const config = buildConfig('dev', { notifier: { password: '<REDACTED>' } });
    expect(assertNoPlaceholderSecrets(config)).toEqual(['notifier.password']);
  });
});
