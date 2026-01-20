import crypto from 'crypto';

// Mock redis client before importing RedisService
jest.mock('redis', () => {
  const mockClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(0),
    multi: jest.fn(),
    incrBy: jest.fn(),
    expire: jest.fn(),
  };

  return {
    createClient: jest.fn().mockReturnValue(mockClient),
  };
});

// Mock BaseService before importing RedisService
jest.mock('./base_service', () => ({
  BaseService: class MockBaseService {
    config: any;
    constructor(config: any) {
      this.config = config;
    }
  },
}));

import { RedisService, DEFAULT_TTL_IN_SECONDS, DEFAULT_PREFIX } from './redis.service';
import { createClient } from 'redis';

describe('RedisService', () => {
  let service: RedisService;
  let mockClient: any;
  let mockConfig: any;

  beforeEach(() => {
    // Create a fresh mock client for each test
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(0),
      multi: jest.fn(),
      incrBy: jest.fn(),
      expire: jest.fn(),
    };

    // Mock createClient to return our mock client
    (createClient as jest.Mock).mockReturnValue(mockClient);

    mockConfig = {
      redis: {
        isEnabled: true,
        host: 'localhost',
        port: 6379,
        prefix: 'test-id',
        defaultTtl: 600,
      },
    };

    // Create service with mocked config and logger
    service = new (RedisService as any)(mockConfig, {});

    // Manually inject the mock client since createClient is mocked
    (service as any).client = mockClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should compile without errors', () => {
      expect(RedisService).toBeDefined();
      expect(typeof RedisService).toBe('function');
    });

    it('should export DEFAULT_TTL_IN_SECONDS constant', () => {
      expect(DEFAULT_TTL_IN_SECONDS).toBeDefined();
      expect(DEFAULT_TTL_IN_SECONDS).toBe(300);
    });

    it('should export DEFAULT_PREFIX constant', () => {
      expect(DEFAULT_PREFIX).toBeDefined();
      expect(typeof DEFAULT_PREFIX).toBe('string');
    });

    it('should use custom prefix from config', () => {
      service = new (RedisService as any)(mockConfig, {});
      // @ts-ignore
      expect(service.prefix).toBe('test-id');
    });

    it('should use custom defaultTtl from config', () => {
      service = new (RedisService as any)(mockConfig, {});
      // @ts-ignore
      expect(service.defaultTtl).toBe(600);
    });

    it('should have isEnabled getter', () => {
      expect(service.isEnabled).toBe(true);
    });

    it('should return false for isEnabled when config disabled', () => {
      const disabledConfig = { redis: { isEnabled: false } };
      const disabledService = new (RedisService as any)(disabledConfig, {});
      expect(disabledService.isEnabled).toBe(false);
    });
  });

  describe('init', () => {
    it('should connect to redis if enabled', async () => {
      service = new (RedisService as any)(mockConfig, {});
      await service.init();

      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should not connect if disabled', async () => {
      const disabledConfig = { redis: { isEnabled: false } };
      const disabledService = new (RedisService as any)(disabledConfig, {});
      await disabledService.init();

      expect(mockClient.connect).not.toHaveBeenCalled();
    });

    it('should throw if connection fails', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection failed'));
      service = new (RedisService as any)(mockConfig, {});

      try {
        await service.init();
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Can not connect to redis');
      }
    });
  });

  describe('stop', () => {
    it('should disconnect from redis if enabled', async () => {
      service = new (RedisService as any)(mockConfig, {});
      await service.stop();

      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should not disconnect if disabled', async () => {
      const disabledConfig = { redis: { isEnabled: false } };
      const disabledService = new (RedisService as any)(disabledConfig, {});
      await disabledService.stop();

      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should throw if disconnection fails', async () => {
      mockClient.disconnect.mockRejectedValue(new Error('Disconnect failed'));
      service = new (RedisService as any)(mockConfig, {});

      try {
        await service.stop();
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Can not disconnect from redis');
      }
    });
  });

  describe('createKey', () => {
    it('should create a key with prefix and string arguments', () => {
      const key = service.createKey('user', 'profile', 'name');

      expect(key).toContain('test-id');
      expect(key).toContain('user');
      expect(key).toContain('profile');
      expect(key).toContain('name');
    });

    it('should hash object arguments', () => {
      const obj = { id: 1, name: 'test' };
      const key = service.createKey('data', obj);

      const expectedHash = crypto
        .createHash('md5')
        .update(JSON.stringify(obj))
        .digest('hex');

      expect(key).toContain('test-id');
      expect(key).toContain('data');
      expect(key).toContain(expectedHash);
    });

    it('should handle numeric arguments', () => {
      const key = service.createKey('cache', 123, 'item');

      expect(key).toContain('test-id');
      expect(key).toContain('123');
      expect(key).toContain('cache');
      expect(key).toContain('item');
    });

    it('should handle mixed arguments', () => {
      const obj = { id: 1 };
      const key = service.createKey('prefix', obj, 'suffix', 456);

      expect(key).toContain('test-id');
      expect(key).toContain('prefix');
      expect(key).toContain('suffix');
      expect(key).toContain('456');
    });
  });

  describe('set', () => {
    it('should set string data', async () => {
      mockClient.set.mockResolvedValue('OK');
      const result = await service.set('key', 'value');

      expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 600 });
      expect(result).toBe('OK');
    });

    it('should stringify object data', async () => {
      mockClient.set.mockResolvedValue('OK');
      const obj = { id: 1, name: 'test' };
      await service.set('key', obj);

      expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(obj), { EX: 600 });
    });

    it('should use provided TTL', async () => {
      mockClient.set.mockResolvedValue('OK');
      await service.set('key', 'value', 900);

      expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 900 });
    });

    it('should use default TTL if not provided', async () => {
      mockClient.set.mockResolvedValue('OK');
      await service.set('key', 'value');

      expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 600 });
    });

    it('should accept array key and createKey', async () => {
      mockClient.set.mockResolvedValue('OK');
      await service.set(['user', 'profile'], { data: 'test' });

      expect(mockClient.set).toHaveBeenCalled();
      const callArgs = mockClient.set.mock.calls[0];
      expect(callArgs[0]).toContain('test-id');
      expect(callArgs[0]).toContain('user');
      expect(callArgs[0]).toContain('profile');
    });

    it('should return null if client not available', async () => {
      const disabledConfig = { redis: { isEnabled: false } };
      const disabledService = new (RedisService as any)(disabledConfig, {});
      const result = await disabledService.set('key', 'value');

      expect(result).toBeNull();
    });
  });

  describe('get', () => {
    it('should get data from redis', async () => {
      mockClient.get.mockResolvedValue('value');
      const result = await service.get('key');

      expect(mockClient.get).toHaveBeenCalledWith('key');
      expect(result).toBe('value');
    });

    it('should return null if key not found', async () => {
      mockClient.get.mockResolvedValue(null);
      const result = await service.get('key');

      expect(result).toBeNull();
    });

    it('should accept array key and createKey', async () => {
      mockClient.get.mockResolvedValue('value');
      await service.get(['user', 'profile']);

      const callArgs = mockClient.get.mock.calls[0];
      expect(callArgs[0]).toContain('test-id');
      expect(callArgs[0]).toContain('user');
      expect(callArgs[0]).toContain('profile');
    });

    it('should return null if client not available', async () => {
      const disabledConfig = { redis: { isEnabled: false } };
      const disabledService = new (RedisService as any)(disabledConfig, {});
      const result = await disabledService.get('key');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a key', async () => {
      mockClient.del.mockResolvedValue(1);
      const result = await service.delete('key');

      expect(mockClient.del).toHaveBeenCalledWith('key');
      expect(result).toBe(1);
    });

    it('should return 0 if key not found', async () => {
      mockClient.del.mockResolvedValue(0);
      const result = await service.delete('key');

      expect(result).toBe(0);
    });

    it('should accept array key and createKey', async () => {
      mockClient.del.mockResolvedValue(1);
      await service.delete(['user', 'profile']);

      const callArgs = mockClient.del.mock.calls[0];
      expect(callArgs[0]).toContain('test-id');
      expect(callArgs[0]).toContain('user');
      expect(callArgs[0]).toContain('profile');
    });

    it('should return 0 if client not available', async () => {
      const disabledConfig = { redis: { isEnabled: false } };
      const disabledService = new (RedisService as any)(disabledConfig, {});
      const result = await disabledService.delete('key');

      expect(result).toBe(0);
    });
  });

  describe('increment', () => {
    it('should increment a value', async () => {
      const multiChain: any = {};
      multiChain.incrBy = jest.fn().mockReturnValue(multiChain);
      multiChain.expire = jest.fn().mockReturnValue(multiChain);
      multiChain.exec = jest.fn().mockResolvedValue([42, 1]);
      mockClient.multi.mockReturnValue(multiChain);

      const result = await service.increment('counter', 5);

      expect(mockClient.multi).toHaveBeenCalled();
      expect(multiChain.incrBy).toHaveBeenCalledWith('counter', 5);
      expect(multiChain.expire).toHaveBeenCalledWith('counter', 600);
      expect(result).toBe(42);
    });

    it('should use provided TTL', async () => {
      const multiChain: any = {};
      multiChain.incrBy = jest.fn().mockReturnValue(multiChain);
      multiChain.expire = jest.fn().mockReturnValue(multiChain);
      multiChain.exec = jest.fn().mockResolvedValue([42, 1]);
      mockClient.multi.mockReturnValue(multiChain);

      await service.increment('counter', 5, 900);

      expect(multiChain.expire).toHaveBeenCalledWith('counter', 900);
    });

    it('should accept array key', async () => {
      const multiChain: any = {};
      multiChain.incrBy = jest.fn().mockReturnValue(multiChain);
      multiChain.expire = jest.fn().mockReturnValue(multiChain);
      multiChain.exec = jest.fn().mockResolvedValue([42, 1]);
      mockClient.multi.mockReturnValue(multiChain);

      await service.increment(['counter', 'users'], 5);

      const callArgs = multiChain.incrBy.mock.calls[0];
      expect(callArgs[0]).toContain('test-id');
      expect(callArgs[0]).toContain('counter');
      expect(callArgs[0]).toContain('users');
      expect(callArgs[1]).toBe(5);
    });

    it('should return 0 if not enabled', async () => {
      const disabledConfig = { redis: { isEnabled: false } };
      const disabledService = new (RedisService as any)(disabledConfig, {});
      const result = await disabledService.increment('counter', 5);

      expect(result).toBe(0);
    });
  });

  describe('getOrSet', () => {
    it('should return cached data if available', async () => {
      const cachedData = { id: 1, name: 'cached' };
      mockClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const fn = jest.fn();
      const result = await service.getOrSet('key', fn);

      expect(result).toEqual({ data: cachedData, isFromCache: true });
      expect(fn).not.toHaveBeenCalled();
    });

    it('should call function if cache miss', async () => {
      mockClient.get.mockResolvedValue(null);

      const freshData = { id: 2, name: 'fresh' };
      const fn = jest.fn().mockResolvedValue(freshData);

      const result = await service.getOrSet('key', fn);

      expect(result).toEqual({ data: freshData, isFromCache: false });
      expect(fn).toHaveBeenCalled();
    });

    it('should accept array key', async () => {
      mockClient.get.mockResolvedValue(null);
      const fn = jest.fn().mockResolvedValue({ data: 'test' });

      await service.getOrSet(['user', 'profile'], fn);

      const getCallArgs = mockClient.get.mock.calls[0];
      expect(getCallArgs[0]).toContain('test-id');
      expect(getCallArgs[0]).toContain('user');
      expect(getCallArgs[0]).toContain('profile');
    });

    it('should work when not enabled', async () => {
      const disabledConfig = { redis: { isEnabled: false } };
      const disabledService = new (RedisService as any)(disabledConfig, {});

      const freshData = { id: 1 };
      const fn = jest.fn().mockResolvedValue(freshData);

      const result = await disabledService.getOrSet('key', fn);

      expect(result).toEqual({ data: freshData, isFromCache: false });
      expect(fn).toHaveBeenCalled();
    });
  });

  describe('getOrSetWithTimestamp', () => {
    it('should return fresh data if no cache exists', async () => {
      mockClient.get.mockResolvedValue(null);

      const freshData = { id: 1 };
      const timeFn = jest.fn().mockResolvedValue(Date.now());
      const setFn = jest.fn().mockResolvedValue(freshData);

      const result = await service.getOrSetWithTimestamp('key', timeFn, setFn);

      expect(result).toEqual({ data: freshData, isFromCache: false });
    });

    it('should invalidate cache if timestamp is newer', async () => {
      const oldTime = new Date('2024-01-01').getTime();
      const newTime = new Date('2024-01-02').getTime();

      let callCount = 0;
      mockClient.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(JSON.stringify(oldTime));
        return Promise.resolve(null);
      });

      const timeFn = jest.fn().mockResolvedValue(newTime);
      const setFn = jest.fn().mockResolvedValue({ id: 1 });

      await service.getOrSetWithTimestamp('key', timeFn, setFn);

      expect(mockClient.del).toHaveBeenCalled();
    });

    it('should work when not enabled', async () => {
      const disabledConfig = { redis: { isEnabled: false } };
      const disabledService = new (RedisService as any)(disabledConfig, {});

      const freshData = { id: 1 };
      const timeFn = jest.fn();
      const setFn = jest.fn().mockResolvedValue(freshData);

      const result = await disabledService.getOrSetWithTimestamp('key', timeFn, setFn);

      expect(result).toEqual({ data: freshData, isFromCache: false });
      expect(timeFn).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in keys', async () => {
      mockClient.set.mockResolvedValue('OK');
      const specialKey = 'key:with:colons:and:dots.';

      await service.set(specialKey, 'value');

      expect(mockClient.set).toHaveBeenCalledWith(specialKey, 'value', { EX: 600 });
    });

    it('should handle very large TTL values', async () => {
      mockClient.set.mockResolvedValue('OK');
      await service.set('key', 'value', 999999);

      expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 999999 });
    });

    it('should handle objects with null values', async () => {
      mockClient.set.mockResolvedValue('OK');
      const objWithNull = { id: 1, value: null };

      await service.set('key', objWithNull);

      expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(objWithNull), { EX: 600 });
    });
  });
});
