const mockClients: any[] = [];
let mockClientFactory: () => any;

jest.mock('ldapts', () => {
  const actual = jest.requireActual('ldapts');
  return {
    ...actual,
    Client: jest.fn().mockImplementation((options: any) => {
      const client = mockClientFactory();
      client.options = options;
      mockClients.push(client);
      return client;
    }),
  };
});

const mockLog = { save: jest.fn() };
jest.mock('./base_service', () => ({
  BaseService: class MockBaseService {
    config: any;
    log = mockLog;
    constructor(config: any) {
      this.config = config;
    }
  },
}));

import * as ldapts from 'ldapts';

import { LdapService, escapeFilterValue, normalizeDn } from './ldap.service';

const GUID_HEX = '0123456789abcdef0123456789abcdef';

const makeClient = () => ({
  isConnected: true,
  bind: jest.fn().mockResolvedValue(undefined),
  unbind: jest.fn().mockResolvedValue(undefined),
  startTLS: jest.fn().mockResolvedValue(undefined),
  search: jest.fn().mockResolvedValue({ searchEntries: [], searchReferences: [] }),
});

const makeConfig = (overrides: any = {}) => ({
  auth_providers: {
    ldap: {
      isEnabled: true,
      connection: { url: 'ldaps://dc.domain.loc:636', bindDN: 'svc@domain.loc', bindPassword: 'secret', timeout: 5000, connectTimeout: 3000 },
      baseDN: 'dc=domain,dc=loc',
      userSearchBase: 'ou=Staff,dc=domain,dc=loc',
      attributes: { email: 'mail', first_name: 'givenName' },
      nestedGroups: false,
      ...overrides,
    },
  },
});

const createService = (overrides: any = {}) => new LdapService(makeConfig(overrides) as any, {} as any, {} as any);

describe('LdapService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClients.length = 0;
    mockClientFactory = makeClient;
  });

  describe('escapeFilterValue', () => {
    it('escapes RFC 4515 special characters', () => {
      expect(escapeFilterValue('a*(b)\\c')).toBe('a\\2a\\28b\\29\\5cc');
    });

    it('escapes NUL and non-ASCII bytes', () => {
      expect(escapeFilterValue('a\0é')).toBe('a\\00\\c3\\a9');
    });

    it('escapes every byte of a Buffer', () => {
      expect(escapeFilterValue(Buffer.from([0x01, 0x41]))).toBe('\\01A');
    });
  });

  describe('normalizeDn', () => {
    it('ignores case and whitespace around separators', () => {
      expect(normalizeDn(' CN=Admins , OU=Groups,DC=Domain ')).toBe('cn=admins,ou=groups,dc=domain');
    });
  });

  describe('when the provider is disabled', () => {
    it('is not enabled without config', () => {
      const service = new LdapService({ auth_providers: {} } as any, {} as any, {} as any);
      expect(service.isEnabled).toBe(false);
    });

    it('is not enabled with isEnabled false', () => {
      const service = createService({ isEnabled: false });
      expect(service.isEnabled).toBe(false);
    });

    it('does not connect on init', async () => {
      const service = createService({ isEnabled: false });
      await service.init();
      expect(ldapts.Client).not.toHaveBeenCalled();
    });

    it('does not read the legacy top-level ldap key', () => {
      const service = new LdapService({ auth_providers: {}, ldap: { isEnabled: true, url: 'ldap://x' } } as any, {} as any, {} as any);
      expect(service.isEnabled).toBe(false);
    });

    it('throws on findUser without contacting the server', async () => {
      const service = createService({ isEnabled: false });
      await expect(service.findUser('john')).rejects.toThrow('not enabled');
      expect(ldapts.Client).not.toHaveBeenCalled();
    });
  });

  describe('init and connection', () => {
    it('binds the service account with timeouts', async () => {
      const service = createService();
      await service.init();

      expect(ldapts.Client).toHaveBeenCalledWith(expect.objectContaining({ url: 'ldaps://dc.domain.loc:636', timeout: 5000, connectTimeout: 3000 }));
      expect(mockClients[0].bind).toHaveBeenCalledWith('svc@domain.loc', 'secret');
    });

    it('does not fail init when the directory is unreachable', async () => {
      const service = createService();
      mockClientFactory = () => ({ ...makeClient(), bind: jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED')) });

      await expect(service.init()).resolves.toBeUndefined();
      expect(mockClients[0].unbind).toHaveBeenCalled();
    });

    it('passes a PEM CA string as is', async () => {
      const pem = '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----';
      const service = createService({ connection: { url: 'ldaps://dc:636', tlsOptions: { ca: pem, rejectUnauthorized: false } } });
      await service.init();

      expect(mockClients[0].options.tlsOptions).toEqual({ ca: pem, rejectUnauthorized: false });
    });

    it('reads the CA from a file path', async () => {
      const fs = require('fs');
      const spy = jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('pem-from-file'));
      const service = createService({ connection: { url: 'ldaps://dc:636', tlsOptions: { ca: '/etc/ssl/ad-ca.pem' } } });
      await service.init();

      expect(spy).toHaveBeenCalledWith('/etc/ssl/ad-ca.pem');
      expect(mockClients[0].options.tlsOptions.ca).toEqual(Buffer.from('pem-from-file'));
      spy.mockRestore();
    });

    it('calls startTLS before bind on a plain ldap url', async () => {
      const service = createService({ connection: { url: 'ldap://dc:389', startTLS: true, bindDN: 'svc', bindPassword: 'pw' } });
      await service.init();

      expect(mockClients[0].startTLS).toHaveBeenCalled();
      expect(mockClients[0].startTLS.mock.invocationCallOrder[0]).toBeLessThan(mockClients[0].bind.mock.invocationCallOrder[0]);
    });

    it('does not call startTLS on ldaps', async () => {
      const service = createService({ connection: { url: 'ldaps://dc:636', startTLS: true } });
      await service.init();

      expect(mockClients[0].startTLS).not.toHaveBeenCalled();
    });

    it('reconnects when the client is not connected', async () => {
      const service = createService();
      await service.init();
      mockClients[0].isConnected = false;

      await service.findUser('john');

      expect(mockClients).toHaveLength(2);
      expect(mockClients[1].bind).toHaveBeenCalled();
      expect(mockClients[1].search).toHaveBeenCalled();
    });

    it('reuses a connected client', async () => {
      const service = createService();
      await service.findUser('john');
      await service.findUser('jane');

      expect(mockClients).toHaveLength(1);
    });

    it('retries once on a connection error', async () => {
      const service = createService();
      await service.init();
      mockClients[0].search.mockRejectedValue(new Error('socket hang up'));

      await service.findUser('john');

      expect(mockClients).toHaveLength(2);
      expect(mockClients[1].search).toHaveBeenCalledTimes(1);
    });

    it('does not retry on an LDAP result error', async () => {
      const service = createService();
      await service.init();
      mockClients[0].search.mockRejectedValue(new ldapts.InsufficientAccessError());

      await expect(service.findUser('john')).rejects.toThrow();
      expect(mockClients).toHaveLength(1);
    });

    it('unbinds the service client on stop', async () => {
      const service = createService();
      await service.init();
      await service.stop();

      expect(mockClients[0].unbind).toHaveBeenCalled();
    });
  });

  describe('findUser', () => {
    it('returns null when nothing is found', async () => {
      const service = createService();
      await expect(service.findUser('john')).resolves.toBeNull();
    });

    it('returns the single entry', async () => {
      const entry = { dn: 'cn=john,ou=Staff,dc=domain,dc=loc' };
      const service = createService();
      await service.init();
      mockClients[0].search.mockResolvedValue({ searchEntries: [entry], searchReferences: [] });

      await expect(service.findUser('john')).resolves.toBe(entry);
    });

    it('throws when many entries are found', async () => {
      const service = createService();
      await service.init();
      mockClients[0].search.mockResolvedValue({ searchEntries: [{ dn: 'a' }, { dn: 'b' }], searchReferences: [] });

      await expect(service.findUser('john')).rejects.toThrow('Many users found.');
    });

    it('does not search for an empty username', async () => {
      const service = createService();
      await expect(service.findUser('  ')).resolves.toBeNull();
      expect(ldapts.Client).not.toHaveBeenCalled();
    });

    it('searches userSearchBase with a subtree scope and the needed attributes', async () => {
      const service = createService();
      await service.findUser('john');

      const [base, options] = mockClients[0].search.mock.calls[0];
      expect(base).toBe('ou=Staff,dc=domain,dc=loc');
      expect(options.scope).toBe('sub');
      expect(options.attributes).toEqual(
        expect.arrayContaining(['dn', 'objectGUID', 'userAccountControl', 'accountExpires', 'memberOf', 'mail', 'givenName']),
      );
      expect(options.explicitBufferAttributes).toEqual(['objectGUID']);
    });

    it('falls back to baseDN when userSearchBase is not set', async () => {
      const service = createService({ userSearchBase: undefined });
      await service.findUser('john');

      expect(mockClients[0].search.mock.calls[0][0]).toBe('dc=domain,dc=loc');
    });

    it('substitutes the escaped username into the default filter', async () => {
      const service = createService();
      await service.findUser('john');

      expect(mockClients[0].search.mock.calls[0][1].filter).toBe('(&(objectClass=user)(|(sAMAccountName=john)(userPrincipalName=john)))');
    });

    it('substitutes into a custom filter template', async () => {
      const service = createService({ userFilter: '(&(objectClass=person)(uid={{username}}))' });
      await service.findUser('john');

      expect(mockClients[0].search.mock.calls[0][1].filter).toBe('(&(objectClass=person)(uid=john))');
    });

    it('neutralizes a filter injection attempt in the username', async () => {
      const service = createService();
      await service.findUser('*)(uid=*');

      const filter = mockClients[0].search.mock.calls[0][1].filter;
      expect(filter).toBe('(&(objectClass=user)(|(sAMAccountName=\\2a\\29\\28uid=\\2a)(userPrincipalName=\\2a\\29\\28uid=\\2a)))');
      expect(() => ldapts.FilterParser.parseString(filter)).not.toThrow();
      expect(ldapts.FilterParser.parseString(filter).toString()).toContain('\\2a\\29\\28uid=\\2a');
    });
  });

  describe('findUserById', () => {
    it('escapes a binary GUID as \\xx pairs', async () => {
      const service = createService();
      await service.findUserById(GUID_HEX);

      const [base, options] = mockClients[0].search.mock.calls[0];
      expect(base).toBe('ou=Staff,dc=domain,dc=loc');
      expect(options.filter).toBe('(objectGUID=\\01\\23\\45\\67\\89\\ab\\cd\\ef\\01\\23\\45\\67\\89\\ab\\cd\\ef)');
      expect(() => ldapts.FilterParser.parseString(options.filter)).not.toThrow();
    });

    it('rejects a non-hex id for a binary attribute without searching', async () => {
      const service = createService();
      await expect(service.findUserById('*)(objectClass=*')).resolves.toBeNull();
      expect(ldapts.Client).not.toHaveBeenCalled();
    });

    it('escapes the value for a string idAttribute', async () => {
      const service = createService({ idAttribute: 'uid' });
      await service.findUserById('a*b');

      const [, options] = mockClients[0].search.mock.calls[0];
      expect(options.filter).toBe('(uid=a\\2ab)');
      expect(options.explicitBufferAttributes).toEqual([]);
    });

    it('returns null when nothing is found', async () => {
      const service = createService();
      await expect(service.findUserById(GUID_HEX)).resolves.toBeNull();
    });

    it('throws when many entries are found', async () => {
      const service = createService();
      await service.init();
      mockClients[0].search.mockResolvedValue({ searchEntries: [{ dn: 'a' }, { dn: 'b' }], searchReferences: [] });

      await expect(service.findUserById(GUID_HEX)).rejects.toThrow('Many users found.');
    });
  });

  describe('getUserId', () => {
    it('returns hex for a Buffer value', () => {
      const service = createService();
      expect(service.getUserId({ dn: 'x', objectGUID: Buffer.from(GUID_HEX, 'hex') })).toBe(GUID_HEX);
    });

    it('returns the string as is', () => {
      const service = createService({ idAttribute: 'uid' });
      expect(service.getUserId({ dn: 'x', uid: 'john' })).toBe('john');
    });

    it('takes the first value of an array', () => {
      const service = createService({ idAttribute: 'uid' });
      expect(service.getUserId({ dn: 'x', uid: ['john', 'jane'] })).toBe('john');
    });

    it('throws when the attribute is missing', () => {
      const service = createService();
      expect(() => service.getUserId({ dn: 'x' })).toThrow('no objectGUID');
    });
  });

  describe('verifyPassword', () => {
    it('returns true on a successful bind and unbinds', async () => {
      const service = createService();
      await expect(service.verifyPassword('cn=john,dc=domain,dc=loc', 'pw')).resolves.toBe(true);

      expect(mockClients).toHaveLength(1);
      expect(mockClients[0].bind).toHaveBeenCalledWith('cn=john,dc=domain,dc=loc', 'pw');
      expect(mockClients[0].unbind).toHaveBeenCalled();
    });

    it('does not use the service account client', async () => {
      const service = createService();
      await service.init();
      await service.verifyPassword('cn=john,dc=domain,dc=loc', 'pw');

      expect(mockClients).toHaveLength(2);
      expect(mockClients[0].bind).toHaveBeenCalledTimes(1);
      expect(mockClients[0].bind).not.toHaveBeenCalledWith('cn=john,dc=domain,dc=loc', 'pw');
    });

    it('returns false on invalid credentials and still unbinds', async () => {
      mockClientFactory = () => {
        const client = makeClient();
        client.bind.mockRejectedValue(new ldapts.InvalidCredentialsError());
        return client;
      };
      const service = createService();

      await expect(service.verifyPassword('cn=john,dc=domain,dc=loc', 'bad')).resolves.toBe(false);
      expect(mockClients[0].unbind).toHaveBeenCalled();
    });

    it('rethrows other errors and still unbinds', async () => {
      mockClientFactory = () => {
        const client = makeClient();
        client.bind.mockRejectedValue(new Error('connect ECONNREFUSED'));
        return client;
      };
      const service = createService();

      await expect(service.verifyPassword('cn=john,dc=domain,dc=loc', 'pw')).rejects.toThrow('ECONNREFUSED');
      expect(mockClients[0].unbind).toHaveBeenCalled();
    });

    it('returns false for an empty password without creating a client', async () => {
      const service = createService();
      await expect(service.verifyPassword('cn=john,dc=domain,dc=loc', '')).resolves.toBe(false);
      expect(ldapts.Client).not.toHaveBeenCalled();
    });

    it('returns false for a whitespace-only password without creating a client', async () => {
      const service = createService();
      await expect(service.verifyPassword('cn=john,dc=domain,dc=loc', '   ')).resolves.toBe(false);
      expect(ldapts.Client).not.toHaveBeenCalled();
    });

    it('returns false for an empty dn without creating a client', async () => {
      const service = createService();
      await expect(service.verifyPassword('', 'pw')).resolves.toBe(false);
      expect(ldapts.Client).not.toHaveBeenCalled();
    });

    it('never logs the password', async () => {
      const service = createService();
      await service.verifyPassword('cn=john,dc=domain,dc=loc', 'super-secret-pw');

      expect(JSON.stringify(mockLog.save.mock.calls)).not.toContain('super-secret-pw');
    });
  });

  describe('getUserGroups', () => {
    it('queries the in-chain matching rule when nestedGroups is true', async () => {
      const service = createService({ nestedGroups: true });
      await service.init();
      mockClients[0].search.mockResolvedValue({ searchEntries: [{ dn: 'cn=A,dc=x' }, { dn: 'cn=B,dc=x' }], searchReferences: [] });

      const groups = await service.getUserGroups({ dn: 'cn=John (IT),ou=Staff,dc=domain,dc=loc' });

      expect(groups).toEqual(['cn=A,dc=x', 'cn=B,dc=x']);
      const [base, options] = mockClients[0].search.mock.calls[0];
      expect(base).toBe('dc=domain,dc=loc');
      expect(options.filter).toBe('(&(objectClass=group)(member:1.2.840.113556.1.4.1941:=cn=John \\28IT\\29,ou=Staff,dc=domain,dc=loc))');
    });

    it('returns memberOf as an array when nestedGroups is false', async () => {
      const service = createService({ nestedGroups: false });
      const groups = await service.getUserGroups({ dn: 'x', memberOf: ['cn=A,dc=x', 'cn=B,dc=x'] });

      expect(groups).toEqual(['cn=A,dc=x', 'cn=B,dc=x']);
      expect(ldapts.Client).not.toHaveBeenCalled();
    });

    it('normalizes a single memberOf string to an array', async () => {
      const service = createService({ nestedGroups: false });
      await expect(service.getUserGroups({ dn: 'x', memberOf: 'cn=A,dc=x' })).resolves.toEqual(['cn=A,dc=x']);
    });

    it('returns an empty array when memberOf is missing', async () => {
      const service = createService({ nestedGroups: false });
      await expect(service.getUserGroups({ dn: 'x' })).resolves.toEqual([]);
    });
  });

  describe('isAccountDisabled', () => {
    const service = createService();

    it('is true for the ACCOUNTDISABLE bit', () => {
      expect(service.isAccountDisabled({ dn: 'x', userAccountControl: '514' })).toBe(true);
    });

    it('is true for the LOCKOUT bit', () => {
      expect(service.isAccountDisabled({ dn: 'x', userAccountControl: '528' })).toBe(true);
    });

    it('is true for the LOCKOUT bit in the computed attribute', () => {
      expect(service.isAccountDisabled({ dn: 'x', userAccountControl: '512', 'msDS-User-Account-Control-Computed': '16' })).toBe(true);
    });

    it('is false when the computed attribute has no LOCKOUT bit', () => {
      expect(service.isAccountDisabled({ dn: 'x', userAccountControl: '512', 'msDS-User-Account-Control-Computed': '0' })).toBe(false);
    });

    it('is false for a normal enabled account', () => {
      expect(service.isAccountDisabled({ dn: 'x', userAccountControl: '512' })).toBe(false);
    });

    it('is true when accountExpires is in the past', () => {
      // 2001-01-01T00:00:00Z
      const filetime = ((BigInt(Date.UTC(2001, 0, 1)) + BigInt(11644473600000)) * BigInt(10000)).toString();
      expect(service.isAccountDisabled({ dn: 'x', userAccountControl: '512', accountExpires: filetime })).toBe(true);
    });

    it('is false when accountExpires is in the future', () => {
      const filetime = ((BigInt(Date.now() + 86400000) + BigInt(11644473600000)) * BigInt(10000)).toString();
      expect(service.isAccountDisabled({ dn: 'x', userAccountControl: '512', accountExpires: filetime })).toBe(false);
    });

    it('is false when accountExpires is 0', () => {
      expect(service.isAccountDisabled({ dn: 'x', userAccountControl: '512', accountExpires: '0' })).toBe(false);
    });

    it('is false when accountExpires is the max int64', () => {
      expect(service.isAccountDisabled({ dn: 'x', userAccountControl: '512', accountExpires: '9223372036854775807' })).toBe(false);
    });

    it('is false when the attributes are missing', () => {
      expect(service.isAccountDisabled({ dn: 'x' })).toBe(false);
    });
  });

  describe('groupsExist', () => {
    it('returns only the DNs that exist', async () => {
      const service = createService();
      await service.init();
      mockClients[0].search.mockImplementation(async (base: string) => {
        if (base === 'cn=gone,dc=x') {
          throw new ldapts.NoSuchObjectError();
        }
        return { searchEntries: [{ dn: base }], searchReferences: [] };
      });

      const result = await service.groupsExist(['cn=a,dc=x', 'cn=gone,dc=x', 'cn=b,dc=x']);

      expect(result).toEqual(['cn=a,dc=x', 'cn=b,dc=x']);
      expect(mockClients[0].search.mock.calls[0][1]).toEqual(expect.objectContaining({ scope: 'base', filter: '(objectClass=*)' }));
    });

    it('returns an empty list for no DNs', async () => {
      const service = createService();
      await expect(service.groupsExist([])).resolves.toEqual([]);
    });

    it('rethrows unexpected errors', async () => {
      const service = createService();
      await service.init();
      mockClients[0].search.mockRejectedValue(new ldapts.InsufficientAccessError());

      await expect(service.groupsExist(['cn=a,dc=x'])).rejects.toThrow();
    });
  });

  describe('isSameDn', () => {
    it('compares DNs case-insensitively', () => {
      const service = createService();
      expect(service.isSameDn('CN=Admins, OU=Groups,DC=X', 'cn=admins,ou=groups,dc=x')).toBe(true);
    });

    it('detects different DNs', () => {
      const service = createService();
      expect(service.isSameDn('cn=a,dc=x', 'cn=b,dc=x')).toBe(false);
    });
  });
});
