import { Config, validateLdapConfig } from './index';

function makeConfig(ldap?: Record<string, any>): Config {
  return { auth_providers: ldap ? { ldap } : {} } as unknown as Config;
}

function validLdap(overrides: Record<string, any> = {}) {
  return {
    isEnabled: true,
    connection: { url: 'ldaps://dc.domain.loc:636', bindDN: 'svc@domain.loc', bindPassword: 'secret' },
    baseDN: 'dc=domain,dc=loc',
    accessGroups: ['CN=LIQUIO-PROD-USERS,OU=Groups,DC=DOMAIN,DC=LOC'],
    ...overrides,
  };
}

describe('validateLdapConfig', () => {
  it('passes when the provider is absent', () => {
    expect(() => validateLdapConfig(makeConfig())).not.toThrow();
  });

  it('passes when the provider is disabled and incomplete', () => {
    expect(() => validateLdapConfig(makeConfig({ isEnabled: false }))).not.toThrow();
  });

  it('passes for a complete config with ldaps', () => {
    expect(() => validateLdapConfig(makeConfig(validLdap()))).not.toThrow();
  });

  it('passes for a complete config with ldap', () => {
    const ldap = validLdap({ connection: { url: 'ldap://dc.domain.loc', bindDN: 'svc', bindPassword: 'secret' } });
    expect(() => validateLdapConfig(makeConfig(ldap))).not.toThrow();
  });

  it('fails without connection.url', () => {
    const ldap = validLdap({ connection: { bindDN: 'svc', bindPassword: 'secret' } });
    expect(() => validateLdapConfig(makeConfig(ldap))).toThrow('connection.url is required');
  });

  it('fails for an unsupported url scheme', () => {
    const ldap = validLdap({ connection: { url: 'http://dc.domain.loc', bindDN: 'svc', bindPassword: 'secret' } });
    expect(() => validateLdapConfig(makeConfig(ldap))).toThrow('ldap:// or ldaps://');
  });

  it('fails without connection.bindDN', () => {
    const ldap = validLdap({ connection: { url: 'ldaps://dc', bindPassword: 'secret' } });
    expect(() => validateLdapConfig(makeConfig(ldap))).toThrow('connection.bindDN is required');
  });

  it('fails without connection.bindPassword', () => {
    const ldap = validLdap({ connection: { url: 'ldaps://dc', bindDN: 'svc' } });
    expect(() => validateLdapConfig(makeConfig(ldap))).toThrow('connection.bindPassword is required');
  });

  it('fails without baseDN', () => {
    expect(() => validateLdapConfig(makeConfig(validLdap({ baseDN: undefined })))).toThrow('baseDN is required');
  });

  it('fails when accessGroups is missing', () => {
    expect(() => validateLdapConfig(makeConfig(validLdap({ accessGroups: undefined })))).toThrow('accessGroups must contain at least one group');
  });

  it('fails when accessGroups is empty', () => {
    expect(() => validateLdapConfig(makeConfig(validLdap({ accessGroups: [] })))).toThrow('accessGroups must contain at least one group');
  });

  it('fails when accessGroups has only blank entries', () => {
    expect(() => validateLdapConfig(makeConfig(validLdap({ accessGroups: ['  '] })))).toThrow('accessGroups must contain at least one group');
  });

  it('reports every problem at once', () => {
    expect(() => validateLdapConfig(makeConfig({ isEnabled: true }))).toThrow(/connection\.url.*bindDN.*bindPassword.*baseDN.*accessGroups/);
  });
});
