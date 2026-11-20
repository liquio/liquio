import { findPlaceholderSecrets, findPlaceholderSecretWarnings } from './config_check';

const buildConfig = (environment: string, overrides: Record<string, any> = {}) => ({
  server: { environment, token: 'tok', crypto: { password: 'pwd', iv: 'iv' } },
  notifier: { password: 'secret' },
  db: { password: 'dbpass' },
  auth: { jwtSecret: 'jwt', basicAuthToken: 'basic', clientSecret: 'client' },
  sign: { token: 'signtok' },
  ...overrides,
});

describe('findPlaceholderSecrets', () => {
  it('returns nothing with real secrets', () => {
    expect(findPlaceholderSecrets(buildConfig('production'))).toEqual([]);
  });

  it('reports placeholder, empty and missing secrets', () => {
    const config = buildConfig('dev', {
      server: { environment: 'dev', token: '', crypto: { password: '<REDACTED>' } },
      notifier: { password: ' <REDACTED> ' },
    });
    expect(findPlaceholderSecrets(config)).toEqual(['notifier.password', 'server.token', 'server.crypto.password', 'server.crypto.iv']);
  });

  it('reports db and auth secrets', () => {
    const config = buildConfig('dev', { db: { password: '<REDACTED>' }, auth: { jwtSecret: '<REDACTED>', basicAuthToken: '<REDACTED>' } });
    expect(findPlaceholderSecrets(config)).toEqual(['db.password', 'auth.jwtSecret', 'auth.basicAuthToken']);
  });

  it('checks db.slave.password only when db.slave is configured', () => {
    expect(findPlaceholderSecrets(buildConfig('dev', { db: { password: 'p', slave: { password: '<REDACTED>' } } }))).toEqual(['db.slave.password']);
    expect(findPlaceholderSecrets(buildConfig('dev', { db: { password: 'p', slave: null } }))).toEqual([]);
    expect(findPlaceholderSecrets(buildConfig('dev'))).toEqual([]);
  });
});

describe('findPlaceholderSecretWarnings', () => {
  it('reports auth.clientSecret and sign.token placeholders', () => {
    const config = buildConfig('production', {
      auth: { jwtSecret: 'j', basicAuthToken: 'b', clientSecret: '<REDACTED>' },
      sign: { token: '<REDACTED>' },
    });
    expect(findPlaceholderSecretWarnings(config)).toEqual(['auth.clientSecret', 'sign.token']);
    expect(findPlaceholderSecretWarnings(buildConfig('production'))).toEqual([]);
  });
});
