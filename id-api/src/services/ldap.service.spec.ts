import debug from 'debug';
import * as ldapts from 'ldapts';
import { LdapService, ACCOUNT_CONTROL_FLAGS } from './ldap.service';
import { Config } from '../config';
import { Models } from '../models';
import { Express } from '../types';

// Create debug logger
const testDebug = debug('test:log');

// Mock ldapts module
const mockClientBind = jest.fn<ReturnType<ldapts.Client['bind']>, Parameters<ldapts.Client['bind']>>();
const mockClientSearch = jest.fn<ReturnType<ldapts.Client['search']>, Parameters<ldapts.Client['search']>>();
const mockLdapClient: Partial<ldapts.Client> = {
  bind: mockClientBind,
  search: mockClientSearch,
  isConnected: false,
};

jest.mock('ldapts', () => {
  return {
    Client: jest.fn(() => mockLdapClient),
  };
});

// Mock Log class to use debug module
jest.mock('../lib/log/index.ts', () => {
  return {
    Log: class MockLog {
      private static singleton: MockLog;

      static get() {
        if (!MockLog.singleton) {
          MockLog.singleton = new MockLog();
        }
        return MockLog.singleton;
      }

      save(event: string, data?: any, level?: string) {
        const logData = data ? JSON.stringify(data) : '';
        testDebug(`[${level || 'info'}] ${event} ${logData}`);
      }
    },
  };
});

// Mock BaseService to avoid circular dependency
jest.mock('./base_service', () => {
  return {
    BaseService: class {
      protected log = { save: jest.fn() };
      constructor(
        protected config: any,
        protected models: any,
        protected express: any,
      ) {}
    },
  };
});

describe('LdapService', () => {
  let ldapService: LdapService;
  let mockConfig: Config;
  let mockModels: Models;
  let mockExpress: Express;

  beforeEach(() => {
    mockConfig = {
      ldap: {
        isEnabled: false,
        isRequired: false,
        url: undefined,
        baseDN: undefined,
        username: undefined,
        password: undefined,
      },
    } as unknown as Config;

    mockModels = {} as unknown as Models;
    mockExpress = {} as unknown as Express;

    ldapService = new LdapService(mockConfig, mockModels, mockExpress);
  });

  describe('Basic compilation', () => {
    it('should compile and instantiate', () => {
      expect(ldapService).toBeDefined();
    });

    it('should extend BaseService', () => {
      expect(ldapService).toHaveProperty('config');
      expect(ldapService).toHaveProperty('models');
      expect(ldapService).toHaveProperty('express');
    });

    it('should have ACCOUNT_CONTROL_FLAGS constant', () => {
      expect(ACCOUNT_CONTROL_FLAGS).toBeDefined();
      expect(typeof ACCOUNT_CONTROL_FLAGS).toBe('object');
    });
  });

  describe('isEnabled getter', () => {
    it('should return false when ldap config is not enabled', () => {
      expect(ldapService.isEnabled).toBe(false);
    });

    it('should return true when ldap config is enabled', () => {
      if (mockConfig.ldap) {
        mockConfig.ldap.isEnabled = true;
      }
      const service = new LdapService(mockConfig, mockModels, mockExpress);
      expect(service.isEnabled).toBe(true);
    });
  });

  describe('isRequired getter', () => {
    it('should return false when ldap config is not required', () => {
      expect(ldapService.isRequired).toBe(false);
    });

    it('should return true when ldap config is required', () => {
      if (mockConfig.ldap) {
        mockConfig.ldap.isRequired = true;
      }
      const service = new LdapService(mockConfig, mockModels, mockExpress);
      expect(service.isRequired).toBe(true);
    });
  });

  describe('connect', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockClientBind.mockResolvedValue(undefined);
    });

    it('should call client.bind with username and password', async () => {
      if (mockConfig.ldap) {
        mockConfig.ldap.isEnabled = true;
        mockConfig.ldap.url = 'ldap://localhost:389';
        mockConfig.ldap.username = 'cn=admin,dc=example,dc=com';
        mockConfig.ldap.password = 'password123';
      }

      const service = new LdapService(mockConfig, mockModels, mockExpress);
      await service.connect();

      expect(mockClientBind).toHaveBeenCalledWith('cn=admin,dc=example,dc=com', 'password123');
    });

    it('should throw error when bind fails', async () => {
      const bindError = new Error('Bind failed');
      mockClientBind.mockRejectedValueOnce(bindError);

      if (mockConfig.ldap) {
        mockConfig.ldap.isEnabled = true;
        mockConfig.ldap.url = 'ldap://localhost:389';
        mockConfig.ldap.username = 'cn=admin,dc=example,dc=com';
        mockConfig.ldap.password = 'password123';
      }

      const service = new LdapService(mockConfig, mockModels, mockExpress);

      await expect(service.connect()).rejects.toThrow('Bind failed');
    });
  });

  describe('getClient', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockClientBind.mockResolvedValue(undefined);
      Object.defineProperty(mockLdapClient, 'isConnected', {
        value: false,
        writable: true,
        configurable: true,
      });
    });

    it('should return client if already connected', async () => {
      if (mockConfig.ldap) {
        mockConfig.ldap.isEnabled = true;
        mockConfig.ldap.url = 'ldap://localhost:389';
      }

      const service = new LdapService(mockConfig, mockModels, mockExpress);

      // Mock isConnected to return true
      Object.defineProperty(mockLdapClient, 'isConnected', {
        value: true,
        writable: true,
        configurable: true,
      });

      const client = await service.getClient();

      expect(client).toBeDefined();
      expect(mockClientBind).not.toHaveBeenCalled();
    });

    it('should call connect if not connected and return client', async () => {
      if (mockConfig.ldap) {
        mockConfig.ldap.isEnabled = true;
        mockConfig.ldap.url = 'ldap://localhost:389';
        mockConfig.ldap.username = 'cn=admin,dc=example,dc=com';
        mockConfig.ldap.password = 'password123';
      }

      const service = new LdapService(mockConfig, mockModels, mockExpress);

      const client = await service.getClient();

      expect(mockClientBind).toHaveBeenCalled();
      expect(client).toBeDefined();
    });
  });

  describe('findUserByPrincipal', () => {
    const testPrincipal = 'user@example.com';
    const mockUserEntry: ldapts.Entry = {
      dn: 'cn=user,dc=example,dc=com',
      mail: 'user@example.com',
      displayName: 'John Doe',
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockClientBind.mockResolvedValue(undefined);
      mockClientSearch.mockResolvedValue({
        searchEntries: [],
        searchReferences: [],
      });
      Object.defineProperty(mockLdapClient, 'isConnected', {
        value: true,
        writable: true,
        configurable: true,
      });

      if (mockConfig.ldap) {
        mockConfig.ldap.isEnabled = true;
        mockConfig.ldap.url = 'ldap://localhost:389';
        mockConfig.ldap.baseDN = 'dc=example,dc=com';
        mockConfig.ldap.username = 'cn=admin,dc=example,dc=com';
        mockConfig.ldap.password = 'password123';
      }
    });

    it('should return user when one is found', async () => {
      mockClientSearch.mockResolvedValueOnce({
        searchEntries: [mockUserEntry],
        searchReferences: [],
      });

      const service = new LdapService(mockConfig, mockModels, mockExpress);
      const user = await service.findUserByPrincipal(testPrincipal);

      expect(user).toEqual(mockUserEntry);
      expect(mockClientSearch).toHaveBeenCalledWith('dc=example,dc=com', {
        scope: 'sub',
        filter: `(&(objectClass=user)(userPrincipalName=${testPrincipal}))`,
      });
    });

    it('should return null when user not found', async () => {
      mockClientSearch.mockResolvedValueOnce({
        searchEntries: [],
        searchReferences: [],
      });

      const service = new LdapService(mockConfig, mockModels, mockExpress);
      const user = await service.findUserByPrincipal(testPrincipal);

      expect(user).toBeNull();
    });

    it('should throw error when multiple users found', async () => {
      const mockUserEntry2: ldapts.Entry = {
        dn: 'cn=user2,dc=example,dc=com',
        mail: 'user2@example.com',
        displayName: 'Jane Doe',
      };

      mockClientSearch.mockResolvedValueOnce({
        searchEntries: [mockUserEntry, mockUserEntry2],
        searchReferences: [],
      });

      const service = new LdapService(mockConfig, mockModels, mockExpress);

      await expect(service.findUserByPrincipal(testPrincipal)).rejects.toThrow('Many users found.');
    });

    it('should throw error when search fails', async () => {
      const searchError = new Error('Search failed');
      mockClientSearch.mockRejectedValueOnce(searchError);

      const service = new LdapService(mockConfig, mockModels, mockExpress);

      await expect(service.findUserByPrincipal(testPrincipal)).rejects.toThrow('Search failed');
    });
  });

  describe('findUserByFullName', () => {
    const testFullName = 'John Doe';
    const mockUserEntry: ldapts.Entry = {
      dn: 'cn=john.doe,dc=example,dc=com',
      mail: 'john.doe@example.com',
      displayName: 'John Doe',
      description: 'John Doe',
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockClientBind.mockResolvedValue(undefined);
      mockClientSearch.mockResolvedValue({
        searchEntries: [],
        searchReferences: [],
      });
      Object.defineProperty(mockLdapClient, 'isConnected', {
        value: true,
        writable: true,
        configurable: true,
      });

      if (mockConfig.ldap) {
        mockConfig.ldap.isEnabled = true;
        mockConfig.ldap.url = 'ldap://localhost:389';
        mockConfig.ldap.baseDN = 'dc=example,dc=com';
        mockConfig.ldap.username = 'cn=admin,dc=example,dc=com';
        mockConfig.ldap.password = 'password123';
      }
    });

    it('should return user when one is found', async () => {
      mockClientSearch.mockResolvedValueOnce({
        searchEntries: [mockUserEntry],
        searchReferences: [],
      });

      const service = new LdapService(mockConfig, mockModels, mockExpress);
      const user = await service.findUserByFullName(testFullName);

      expect(user).toEqual(mockUserEntry);
      expect(mockClientSearch).toHaveBeenCalledWith('dc=example,dc=com', {
        scope: 'sub',
        filter: `(&(objectClass=user)(description=${testFullName}))`,
      });
    });

    it('should return null when user not found', async () => {
      mockClientSearch.mockResolvedValueOnce({
        searchEntries: [],
        searchReferences: [],
      });

      const service = new LdapService(mockConfig, mockModels, mockExpress);
      const user = await service.findUserByFullName(testFullName);

      expect(user).toBeNull();
    });

    it('should throw error when multiple users found', async () => {
      const mockUserEntry2: ldapts.Entry = {
        dn: 'cn=john.doe2,dc=example,dc=com',
        mail: 'john.doe2@example.com',
        displayName: 'John Doe',
        description: 'John Doe',
      };

      mockClientSearch.mockResolvedValueOnce({
        searchEntries: [mockUserEntry, mockUserEntry2],
        searchReferences: [],
      });

      const service = new LdapService(mockConfig, mockModels, mockExpress);

      await expect(service.findUserByFullName(testFullName)).rejects.toThrow('Many users found.');
    });

    it('should throw error when search fails', async () => {
      const searchError = new Error('Search failed');
      mockClientSearch.mockRejectedValueOnce(searchError);

      const service = new LdapService(mockConfig, mockModels, mockExpress);

      await expect(service.findUserByFullName(testFullName)).rejects.toThrow('Search failed');
    });
  });

  describe('findGroupByDN', () => {
    const testDN = 'cn=admin-group,ou=groups,dc=example,dc=com';
    const mockGroupEntry: ldapts.Entry = {
      dn: testDN,
      cn: 'admin-group',
      objectClass: 'group',
      member: ['cn=user1,dc=example,dc=com', 'cn=user2,dc=example,dc=com'],
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockClientBind.mockResolvedValue(undefined);
      mockClientSearch.mockResolvedValue({
        searchEntries: [],
        searchReferences: [],
      });
      Object.defineProperty(mockLdapClient, 'isConnected', {
        value: true,
        writable: true,
        configurable: true,
      });

      if (mockConfig.ldap) {
        mockConfig.ldap.isEnabled = true;
        mockConfig.ldap.url = 'ldap://localhost:389';
        mockConfig.ldap.baseDN = 'dc=example,dc=com';
        mockConfig.ldap.username = 'cn=admin,dc=example,dc=com';
        mockConfig.ldap.password = 'password123';
      }
    });

    it('should return group when one is found', async () => {
      mockClientSearch.mockResolvedValueOnce({
        searchEntries: [mockGroupEntry],
        searchReferences: [],
      });

      const service = new LdapService(mockConfig, mockModels, mockExpress);
      const group = await service.findGroupByDN(testDN);

      expect(group).toEqual(mockGroupEntry);
      expect(mockClientSearch).toHaveBeenCalledWith('dc=example,dc=com', {
        scope: 'sub',
        filter: `(&(objectClass=group)(distinguishedName=${testDN}))`,
      });
    });

    it('should return null when group not found', async () => {
      mockClientSearch.mockResolvedValueOnce({
        searchEntries: [],
        searchReferences: [],
      });

      const service = new LdapService(mockConfig, mockModels, mockExpress);
      const group = await service.findGroupByDN(testDN);

      expect(group).toBeNull();
    });

    it('should throw error when multiple groups found', async () => {
      const mockGroupEntry2: ldapts.Entry = {
        dn: 'cn=admin-group2,ou=groups,dc=example,dc=com',
        cn: 'admin-group2',
        objectClass: 'group',
      };

      mockClientSearch.mockResolvedValueOnce({
        searchEntries: [mockGroupEntry, mockGroupEntry2],
        searchReferences: [],
      });

      const service = new LdapService(mockConfig, mockModels, mockExpress);

      await expect(service.findGroupByDN(testDN)).rejects.toThrow('Many groups found.');
    });

    it('should throw error when search fails', async () => {
      const searchError = new Error('Search failed');
      mockClientSearch.mockRejectedValueOnce(searchError);

      const service = new LdapService(mockConfig, mockModels, mockExpress);

      await expect(service.findGroupByDN(testDN)).rejects.toThrow('Search failed');
    });
  });

  describe('unpackUserAccountControl', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockClientBind.mockResolvedValue(undefined);
      Object.defineProperty(mockLdapClient, 'isConnected', {
        value: true,
        writable: true,
        configurable: true,
      });

      if (mockConfig.ldap) {
        mockConfig.ldap.isEnabled = true;
        mockConfig.ldap.url = 'ldap://localhost:389';
      }
    });

    it('should unpack flags when code is 0', () => {
      const service = new LdapService(mockConfig, mockModels, mockExpress);
      const result = service.unpackUserAccountControl(0);

      expect(result).toBeDefined();
      expect(result.SCRIPT).toBe(false);
      expect(result.ACCOUNTDISABLE).toBe(false);
      expect(result.NORMAL_ACCOUNT).toBe(false);
      expect(Object.keys(result).length).toBe(Object.keys(ACCOUNT_CONTROL_FLAGS).length);
    });

    it('should correctly identify NORMAL_ACCOUNT flag', () => {
      const service = new LdapService(mockConfig, mockModels, mockExpress);
      // NORMAL_ACCOUNT = 512
      const result = service.unpackUserAccountControl(512);

      expect(result.NORMAL_ACCOUNT).toBe(true);
      expect(result.SCRIPT).toBe(false);
      expect(result.ACCOUNTDISABLE).toBe(false);
    });

    it('should correctly identify ACCOUNTDISABLE flag', () => {
      const service = new LdapService(mockConfig, mockModels, mockExpress);
      // ACCOUNTDISABLE = 2
      const result = service.unpackUserAccountControl(2);

      expect(result.ACCOUNTDISABLE).toBe(true);
      expect(result.SCRIPT).toBe(false);
      expect(result.NORMAL_ACCOUNT).toBe(false);
    });

    it('should correctly identify multiple flags', () => {
      const service = new LdapService(mockConfig, mockModels, mockExpress);
      // NORMAL_ACCOUNT (512) + ACCOUNTDISABLE (2) = 514
      const result = service.unpackUserAccountControl(514);

      expect(result.ACCOUNTDISABLE).toBe(true);
      expect(result.NORMAL_ACCOUNT).toBe(true);
      expect(result.SCRIPT).toBe(false);
      expect(result.DONT_EXPIRE_PASSWORD).toBe(false);
    });

    it('should correctly identify DONT_EXPIRE_PASSWORD flag', () => {
      const service = new LdapService(mockConfig, mockModels, mockExpress);
      // DONT_EXPIRE_PASSWORD = 65536
      const result = service.unpackUserAccountControl(65536);

      expect(result.DONT_EXPIRE_PASSWORD).toBe(true);
      expect(result.SCRIPT).toBe(false);
      expect(result.ACCOUNTDISABLE).toBe(false);
    });

    it('should correctly identify combined common flags', () => {
      const service = new LdapService(mockConfig, mockModels, mockExpress);
      // NORMAL_ACCOUNT (512) + DONT_EXPIRE_PASSWORD (65536) + ACCOUNTDISABLE (2) = 66050
      const result = service.unpackUserAccountControl(66050);

      expect(result.NORMAL_ACCOUNT).toBe(true);
      expect(result.DONT_EXPIRE_PASSWORD).toBe(true);
      expect(result.ACCOUNTDISABLE).toBe(true);
      expect(result.SCRIPT).toBe(false);
      expect(result.PASSWD_NOTREQD).toBe(false);
    });

    it('should return object with all flag keys', () => {
      const service = new LdapService(mockConfig, mockModels, mockExpress);
      const result = service.unpackUserAccountControl(0);

      const expectedKeys = Object.keys(ACCOUNT_CONTROL_FLAGS);
      const resultKeys = Object.keys(result);

      expect(resultKeys.sort()).toEqual(expectedKeys.sort());
    });

    it('should handle large code values', () => {
      const service = new LdapService(mockConfig, mockModels, mockExpress);
      // All flags OR'd together
      const allFlagsCode = Object.values(ACCOUNT_CONTROL_FLAGS).reduce((acc, flag) => acc | flag, 0);
      const result = service.unpackUserAccountControl(allFlagsCode);

      expect(Object.values(result).every((v) => v === true)).toBe(true);
    });
  });
});
