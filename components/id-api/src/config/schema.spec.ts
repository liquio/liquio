import path from 'node:path';

import { Config as ConfigLoader, ConfigValidationError } from '@liquio/back-core';

import { buildIdApiConfigSchema } from './schema';

const SENTINEL = 'Basic c2VudGluZWw6c2VudGluZWwtc2VjcmV0';

const base = (extra: Record<string, any> = {}): Record<string, any> => ({
  db: { host: 'h', port: 5432, database: 'd', username: 'u', password: 'p' },
  auth_providers: {},
  redis: {},
  ...extra,
});

const parse = (raw: Record<string, any>, env = 'test') => ConfigLoader.fromObject<any>(raw, { schema: buildIdApiConfigSchema(env) }).toObject();

const issuesOf = (raw: Record<string, any>, env = 'test'): { path: string; message: string }[] => {
  try {
    parse(raw, env);
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigValidationError);
    return (error as ConfigValidationError).issues;
  }
  throw new Error('expected ConfigValidationError');
};

const validLdap = (overrides: Record<string, any> = {}) => ({
  isEnabled: true,
  connection: { url: 'ldaps://dc.domain.loc:636', bindDN: 'svc@domain.loc', bindPassword: 'secret' },
  baseDN: 'dc=domain,dc=loc',
  accessGroups: ['CN=LIQUIO-PROD-USERS,OU=Groups,DC=DOMAIN,DC=LOC'],
  ...overrides,
});

const PLAIN_HTTP_MESSAGE =
  'uses plain http:// in production: use https:// (and internalTransport.ca for a private CA), or set internalTransport.allowPlainHttp to true when NetworkPolicies/service mesh protect the traffic';

describe('buildIdApiConfigSchema', () => {
  describe('config template', () => {
    const templateDir = path.resolve(__dirname, '../../../../config-templates/id');
    const raw = ConfigLoader.load<Record<string, any>>({ configPath: templateDir, secretPath: null }).toObject();

    it.each(['production'])('accepts the template env section for %s', (env) => {
      const section = raw.config[env];
      expect(section).toBeDefined();
      const secrets = { session: { secret_key: ['s'] }, oauth: { secret_key: ['s'] } };
      expect(() => parse({ ...section, ...secrets, versions: raw.versions?.versions }, env)).not.toThrow();
    });
  });

  it('accepts a minimal config and keeps unknown keys', () => {
    const out = parse(base({ extra: { nested: 1 }, cors: { maxAge: 1, other: true } }));
    expect(out.extra).toEqual({ nested: 1 });
    expect(out.cors.other).toBe(true);
  });

  it('accepts numeric strings for numbers', () => {
    expect(() => parse(base({ port: '8080' }))).not.toThrow();
    expect(issuesOf(base({ port: 'abc' })).map((i) => i.path)).toContain('port');
  });

  it.each(['db', 'auth_providers', 'redis'])('requires %s', (key) => {
    const raw = base();
    delete raw[key];
    expect(issuesOf(raw).map((i) => i.path)).toContain(key);
  });

  it.each(['host', 'port', 'database', 'username', 'password'])('requires db.%s', (key) => {
    const raw = base();
    delete raw.db[key];
    expect(issuesOf(raw).map((i) => i.path)).toContain(`db.${key}`);
  });

  describe('OIDC', () => {
    const oidc = (providers: Record<string, any>) => base({ auth_providers: { oidc: providers } });

    it('skips disabled providers and accepts issuer or endpoints', () => {
      expect(() =>
        parse(
          oidc({
            off: { isEnabled: false },
            on: { clientID: 'a', clientSecret: 'b', callbackURL: 'http://cb', issuer: 'http://iss' },
            ep: {
              clientID: 'a',
              clientSecret: 'b',
              callbackURL: 'http://cb',
              authorizationURL: 'http://a',
              tokenURL: 'http://t',
              userInfoURL: 'http://u',
            },
          }),
        ),
      ).not.toThrow();
    });

    it('reports missing fields of an enabled provider', () => {
      expect(issuesOf(oidc({ p1: { isEnabled: true } }))).toEqual(
        expect.arrayContaining([
          { path: 'auth_providers.oidc.p1.clientID', code: 'custom', message: 'is required' },
          { path: 'auth_providers.oidc.p1.clientSecret', code: 'custom', message: 'is required' },
          { path: 'auth_providers.oidc.p1.callbackURL', code: 'custom', message: 'is required' },
          {
            path: 'auth_providers.oidc.p1',
            code: 'custom',
            message: 'must have either "issuer" or all of "authorizationURL", "tokenURL", "userInfoURL"',
          },
        ]),
      );
    });

    it('requires the provider id', () => {
      const issues = issuesOf(oidc({ '': { clientID: 'a', clientSecret: 'b', callbackURL: 'c', issuer: 'i' } }));
      expect(issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'auth_providers.oidc', message: 'providerId (key) is required' })]),
      );
    });

    it('requires all three endpoints without issuer', () => {
      const issues = issuesOf(oidc({ p: { clientID: 'a', clientSecret: 'b', callbackURL: 'c', authorizationURL: 'x', tokenURL: 'y' } }));
      expect(issues.map((i) => i.path)).toEqual(['auth_providers.oidc.p']);
    });
  });

  describe('LDAP', () => {
    const ldap = (value?: Record<string, any>) => base({ auth_providers: value ? { ldap: value } : {} });

    it('passes when absent, disabled and incomplete, or complete', () => {
      expect(() => parse(ldap())).not.toThrow();
      expect(() => parse(ldap({ isEnabled: false }))).not.toThrow();
      expect(() => parse(ldap(validLdap()))).not.toThrow();
      expect(() => parse(ldap(validLdap({ connection: { url: 'ldap://dc', bindDN: 'svc', bindPassword: 'p' } })))).not.toThrow();
    });

    it('requires connection.url and rejects other schemes', () => {
      expect(issuesOf(ldap(validLdap({ connection: { bindDN: 'svc', bindPassword: 'p' } })))).toEqual([
        { path: 'auth_providers.ldap.connection.url', code: 'custom', message: 'is required' },
      ]);
      expect(issuesOf(ldap(validLdap({ connection: { url: 'http://x', bindDN: 'svc', bindPassword: 'p' } })))).toEqual([
        { path: 'auth_providers.ldap.connection.url', code: 'custom', message: 'must use the ldap:// or ldaps:// scheme' },
      ]);
    });

    it('requires service account, baseDN, access groups and a positive interval', () => {
      const issues = issuesOf(ldap({ isEnabled: true, connection: { url: 'ldaps://x' }, accessGroups: [' '], sync: { intervalMinutes: 0 } }));
      expect(issues).toEqual(
        expect.arrayContaining([
          { path: 'auth_providers.ldap.connection.bindDN', code: 'custom', message: 'is required' },
          { path: 'auth_providers.ldap.connection.bindPassword', code: 'custom', message: 'is required' },
          { path: 'auth_providers.ldap.baseDN', code: 'custom', message: 'is required' },
          { path: 'auth_providers.ldap.accessGroups', code: 'custom', message: 'must contain at least one group' },
          { path: 'auth_providers.ldap.sync.intervalMinutes', code: 'custom', message: 'must be a number greater than 0' },
        ]),
      );
    });

    it('requires at least one access group when the list is missing', () => {
      const cfg = validLdap();
      delete (cfg as any).accessGroups;
      expect(issuesOf(ldap(cfg)).map((i) => i.path)).toEqual(['auth_providers.ldap.accessGroups']);
    });
  });

  describe('internal transport', () => {
    const plain = (extra: Record<string, any> = {}) =>
      base({
        notify: { url: 'http://notification:80' },
        pingRoutes: { notify: 'http://notification:80/test/ping' },
        x509: { externalUrl: 'http://sign-tool:3004' },
        ...extra,
      });

    it.each(['production', 'prod'])('rejects plain http URLs in %s', (env) => {
      expect(issuesOf(plain(), env)).toEqual([
        { path: 'notify.url', code: 'custom', message: PLAIN_HTTP_MESSAGE },
        { path: 'pingRoutes.notify', code: 'custom', message: PLAIN_HTTP_MESSAGE },
        { path: 'x509.externalUrl', code: 'custom', message: PLAIN_HTTP_MESSAGE },
      ]);
    });

    it('rejects when allowPlainHttp is not exactly true', () => {
      expect(issuesOf(plain({ internalTransport: { allowPlainHttp: false } }), 'production')).toHaveLength(3);
    });

    it('allows plain http with the opt-in, in other envs, for https and blank URLs', () => {
      expect(() => parse(plain({ internalTransport: { allowPlainHttp: true } }), 'production')).not.toThrow();
      expect(() => parse(plain(), 'localhost')).not.toThrow();
      expect(() =>
        parse(base({ notify: { url: 'https://n' }, pingRoutes: { notify: ' ' }, x509: { externalUrl: 'https://x' } }), 'prod'),
      ).not.toThrow();
    });

    it('matches http:// case-insensitively after trimming', () => {
      expect(issuesOf(base({ notify: { url: '  HTTP://n' } }), 'production').map((i) => i.path)).toEqual(['notify.url']);
    });

    it('never puts the URL value in the message', () => {
      try {
        parse(base({ notify: { url: 'http://sentinel-host' } }), 'production');
        throw new Error('expected ConfigValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigValidationError);
        expect((error as Error).message).not.toContain('sentinel-host');
      }
    });
  });

  it('never puts secret values in the error message', () => {
    try {
      parse(base({ auth_providers: { oidc: { p: { clientSecret: SENTINEL } } }, port: SENTINEL }));
      throw new Error('expected ConfigValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as Error).message).not.toContain(SENTINEL);
    }
  });
});
