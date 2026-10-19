import { assertNoPlaceholderSecrets, assertTaskTokenIsNotDefault, findPlaceholderSecrets, findPlaceholderSecretWarnings } from './config_check';

const buildConfig = (environment: string, overrides: Record<string, any> = {}) => ({
  server: { environment, token: 'tok', crypto: { password: 'pwd', iv: 'iv' } },
  notifier: { password: 'secret' },
  db: { password: 'dbpass' },
  auth: { jwtSecret: 'jwt', basicAuthToken: 'basic', clientSecret: 'client' },
  sign: { token: 'signtok' },
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

describe('config_check: db, auth and sign secrets', () => {
  it.each([
    ['db.password', { db: { password: '<REDACTED>' } }],
    ['auth.jwtSecret', { auth: { jwtSecret: '<REDACTED>', basicAuthToken: 'b' } }],
    ['auth.basicAuthToken', { auth: { jwtSecret: 'j', basicAuthToken: '' } }],
  ])('throws outside dev for placeholder or empty %s', (path, overrides) => {
    expect(() => assertNoPlaceholderSecrets(buildConfig('production', overrides))).toThrow(path);
  });

  it('allows these placeholders in dev and reports them', () => {
    const config = buildConfig('dev', { db: { password: '<REDACTED>' }, auth: { jwtSecret: '<REDACTED>', basicAuthToken: '<REDACTED>' } });
    expect(assertNoPlaceholderSecrets(config)).toEqual(['db.password', 'auth.jwtSecret', 'auth.basicAuthToken']);
  });

  it('only warns, never throws, for auth.clientSecret and sign.token', () => {
    const config = buildConfig('production', {
      auth: { jwtSecret: 'j', basicAuthToken: 'b', clientSecret: '<REDACTED>' },
      sign: { token: '<REDACTED>' },
    });
    expect(() => assertNoPlaceholderSecrets(config)).not.toThrow();
    expect(findPlaceholderSecretWarnings(config)).toEqual(['auth.clientSecret', 'sign.token']);
    expect(findPlaceholderSecretWarnings(buildConfig('production'))).toEqual([]);
  });
});

describe('config_check: db.slave.password', () => {
  it.each(['<REDACTED>', '', '  ', undefined])('throws outside dev for slave password %p when db.slave is configured', (password) => {
    const config = buildConfig('production', { db: { password: 'dbpass', slave: { host: 'replica', password } } });
    expect(() => assertNoPlaceholderSecrets(config)).toThrow(/db\.slave\.password/);
  });

  it('passes with a real slave password', () => {
    const config = buildConfig('production', { db: { password: 'dbpass', slave: { host: 'replica', password: 'real' } } });
    expect(() => assertNoPlaceholderSecrets(config)).not.toThrow();
  });

  it('reports a placeholder slave password in dev without failing', () => {
    const config = buildConfig('dev', { db: { password: 'dbpass', slave: { host: 'replica', password: '<REDACTED>' } } });
    expect(assertNoPlaceholderSecrets(config)).toEqual(['db.slave.password']);
  });

  it('ignores db.slave.password when db.slave is not configured', () => {
    expect(findPlaceholderSecrets(buildConfig('production'))).toEqual([]);
    expect(findPlaceholderSecrets(buildConfig('production', { db: { password: 'dbpass', slave: null } }))).toEqual([]);
    expect(() => assertNoPlaceholderSecrets(buildConfig('production', { db: { password: 'dbpass', slave: undefined } }))).not.toThrow();
  });
});

describe('assertTaskTokenIsNotDefault', () => {
  // The token that used to be committed to config-templates, built here to keep the literal out of the sources.
  const OLD_DEFAULT_TOKEN = `Basic ${Buffer.from(['task', 'task'].join(':')).toString('base64')}`;
  const randomToken = `Basic ${Buffer.from('admin-api:Zk3p9QwLm2Xv8Rt').toString('base64')}`;

  it('accepts a random token', () => {
    expect(() => assertTaskTokenIsNotDefault({ server: { environment: 'production' }, task: { token: randomToken } })).not.toThrow();
  });

  it('throws on the old default token, even in dev', () => {
    expect(() => assertTaskTokenIsNotDefault({ server: { environment: 'dev' }, task: { token: OLD_DEFAULT_TOKEN } })).toThrow(/publicly known/);
    expect(() => assertTaskTokenIsNotDefault({ server: { environment: 'dev' }, task: { token: OLD_DEFAULT_TOKEN.slice(6) } })).toThrow(
      /publicly known/,
    );
  });

  it('throws on an empty or missing token outside dev, allows it in dev', () => {
    expect(() => assertTaskTokenIsNotDefault({ server: { environment: 'production' }, task: { token: '' } })).toThrow(/task\.token/);
    expect(() => assertTaskTokenIsNotDefault({ server: { environment: 'production' } })).toThrow(/task\.token/);
    expect(() => assertTaskTokenIsNotDefault({ server: { environment: 'dev' }, task: { token: '' } })).not.toThrow();
  });
});
