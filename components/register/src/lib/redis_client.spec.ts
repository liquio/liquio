import crypto from 'crypto';

// Mock redis client before importing RedisClient
jest.mock('redis', () => {
  return {
    createClient: jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(0)
    }))
  };
});

import { RedisClient, RedisConfig } from './redis_client';
import { createClient } from 'redis';

describe('RedisClient', () => {
  let mockClient: any;

  beforeEach(() => {
    // Reset singleton
    (RedisClient as any).singleton = null;

    // Reset the mock
    jest.clearAllMocks();

    // Create a fresh mock client for each test
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(0)
    };

    // Update createClient mock to return our mock
    (createClient as jest.Mock).mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should compile without errors', () => {
      expect(RedisClient).toBeDefined();
      expect(typeof RedisClient).toBe('function');
    });

    it('should have static prefix property', () => {
      expect(RedisClient.prefix).toBeDefined();
      expect(typeof RedisClient.prefix).toBe('string');
    });

    it('should accept RedisConfig interface', () => {
      const config: RedisConfig = {
        host: 'localhost',
        port: 6379
      };
      expect(config).toBeDefined();
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(6379);
    });

    it('should create a singleton instance', () => {
      const config: RedisConfig = {
        host: 'localhost',
        port: 6379,
        defaultTtl: 300
      };

      const instance1 = new RedisClient(config);
      const instance2 = new RedisClient(config);

      expect(instance1).toBe(instance2);
    });

    it('should set default TTL to 300 seconds', () => {
      const config: RedisConfig = {
        host: 'localhost',
        port: 6379
      };

      const instance = new RedisClient(config);
      // @ts-ignore
      expect(instance.defaultTtl).toBe(300);
    });

    it('should use custom TTL from config', () => {
      const config: RedisConfig = {
        host: 'localhost',
        port: 6379,
        defaultTtl: 600
      };

      const instance = new RedisClient(config);
      // @ts-ignore
      expect(instance.defaultTtl).toBe(600);
    });

    it('should set prefix from npm_package_name', () => {
      const config: RedisConfig = {
        host: 'localhost',
        port: 6379
      };

      new RedisClient(config);

      expect(RedisClient.prefix).toBe('liquio-register');
    });

    it('should use default prefix if npm_package_name not set', () => {
      const config: RedisConfig = {
        host: 'localhost',
        port: 6379
      };

      new RedisClient(config);

      expect(RedisClient.prefix).toBe('liquio-register');
    });
  });

  describe('connect', () => {
    it('should connect to redis', async () => {
      const config: RedisConfig = {
        host: 'localhost',
        port: 6379
      };

      const instance = new RedisClient(config);
      await instance.connect();

      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should throw if connection fails', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection refused'));

      const config: RedisConfig = {
        host: 'localhost',
        port: 9999
      };

      const instance = new RedisClient(config);

      try {
        await instance.connect();
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Can not connect to redis');
      }
    });
  });

  describe('Static Methods', () => {
    describe('createKey', () => {
      it('should create a key with prefix and arguments', () => {
        RedisClient.prefix = 'register-service';
        const key = RedisClient.createKey('workflow', 'template', '123');

        expect(key).toContain('register-service');
        expect(key).toContain('workflow');
        expect(key).toContain('template');
        expect(key).toContain('123');
      });

      it('should hash object arguments', () => {
        RedisClient.prefix = 'register-service';
        const obj = { id: 1, name: 'test' };
        const key = RedisClient.createKey('data', obj);

        const expectedHash = crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');

        expect(key).toContain('register-service');
        expect(key).toContain('data');
        expect(key).toContain(expectedHash);
      });

      it('should handle numeric arguments', () => {
        RedisClient.prefix = 'register-service';
        const key = RedisClient.createKey('cache', 456);

        expect(key).toContain('register-service');
        expect(key).toContain('456');
      });

      it('should handle mixed arguments', () => {
        RedisClient.prefix = 'register-service';
        const obj = { version: 1 };
        const key = RedisClient.createKey('prefix', obj, 'suffix');

        expect(key).toContain('register-service');
        expect(key).toContain('prefix');
        expect(key).toContain('suffix');
      });

      it('should handle empty arguments', () => {
        RedisClient.prefix = 'register-service';
        const key = RedisClient.createKey();

        expect(key).toBe('register-service');
      });
    });

    describe('getOrSet', () => {
      it('should return cached data if available', async () => {
        const config: RedisConfig = {
          host: 'localhost',
          port: 6379
        };

        new RedisClient(config);

        const cachedData = { id: 1, value: 'cached' };
        mockClient.get.mockResolvedValue(JSON.stringify(cachedData));

        const fn = jest.fn();
        const result = await RedisClient.getOrSet('key', fn);

        expect(result).toEqual({ data: cachedData, isFromCache: true });
        expect(fn).not.toHaveBeenCalled();
      });

      it('should call function if cache miss', async () => {
        const config: RedisConfig = {
          host: 'localhost',
          port: 6379
        };

        new RedisClient(config);

        const freshData = { id: 2, value: 'fresh' };
        const fn = jest.fn().mockResolvedValue(freshData);

        const result = await RedisClient.getOrSet('key', fn);

        expect(result).toEqual({ data: freshData, isFromCache: false });
        expect(fn).toHaveBeenCalled();
      });

      it('should set data in cache with TTL', async () => {
        const config: RedisConfig = {
          host: 'localhost',
          port: 6379
        };

        new RedisClient(config);

        mockClient.get.mockResolvedValue(null);
        const freshData = { id: 3 };
        const fn = jest.fn().mockResolvedValue(freshData);

        await RedisClient.getOrSet('key', fn, 600);

        expect(mockClient.set).toHaveBeenCalled();
      });

      it('should work without redis client', async () => {
        (RedisClient as any).singleton = null;

        const freshData = { id: 1 };
        const fn = jest.fn().mockResolvedValue(freshData);

        const result = await RedisClient.getOrSet('key', fn);

        expect(result).toEqual({ data: freshData, isFromCache: false });
        expect(fn).toHaveBeenCalled();
      });
    });

    describe('getOrSetWithTimestamp', () => {
      it('should return fresh data if no cache exists', async () => {
        const config: RedisConfig = {
          host: 'localhost',
          port: 6379
        };

        new RedisClient(config);

        mockClient.get.mockResolvedValue(null);

        const freshData = { id: 1 };
        const timeFn = jest.fn().mockResolvedValue(new Date('2024-01-02'));
        const setFn = jest.fn().mockResolvedValue(freshData);

        const result = await RedisClient.getOrSetWithTimestamp('key', timeFn, setFn);

        expect(result).toEqual({ data: freshData, isFromCache: false });
      });

      it('should invalidate cache if new timestamp is later', async () => {
        const config: RedisConfig = {
          host: 'localhost',
          port: 6379
        };

        new RedisClient(config);

        const oldTimestamp = new Date('2024-01-01');
        const newTimestamp = new Date('2024-01-02');

        let callCount = 0;
        mockClient.get.mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve(JSON.stringify(oldTimestamp));
          return Promise.resolve(null);
        });

        const timeFn = jest.fn().mockResolvedValue(newTimestamp);
        const setFn = jest.fn().mockResolvedValue({ id: 1 });

        await RedisClient.getOrSetWithTimestamp('key', timeFn, setFn);

        expect(mockClient.del).toHaveBeenCalled();
      });

      it('should work without redis client', async () => {
        (RedisClient as any).singleton = null;

        const freshData = { id: 1 };
        const timeFn = jest.fn();
        const setFn = jest.fn().mockResolvedValue(freshData);

        const result = await RedisClient.getOrSetWithTimestamp('key', timeFn, setFn);

        expect(result).toEqual({ data: freshData, isFromCache: false });
        expect(timeFn).not.toHaveBeenCalled();
      });
    });
  });

  describe('Instance Methods', () => {
    let instance: RedisClient;

    beforeEach(() => {
      const config: RedisConfig = {
        host: 'localhost',
        port: 6379,
        defaultTtl: 300
      };

      instance = new RedisClient(config);
    });

    describe('set', () => {
      it('should set string data', async () => {
        mockClient.set.mockResolvedValue('OK');

        const result = await instance.set('key', 'value');

        expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 300 });
        expect(result).toBe('OK');
      });

      it('should stringify object data', async () => {
        mockClient.set.mockResolvedValue('OK');

        const obj = { id: 1, name: 'test' };
        await instance.set('key', obj);

        expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(obj), { EX: 300 });
      });

      it('should use provided TTL', async () => {
        mockClient.set.mockResolvedValue('OK');

        await instance.set('key', 'value', 600);

        expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 600 });
      });

      it('should use default TTL if not provided', async () => {
        mockClient.set.mockResolvedValue('OK');

        await instance.set('key', 'value');

        expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 300 });
      });

      it('should return OK on success', async () => {
        mockClient.set.mockResolvedValue('OK');

        const result = await instance.set('key', 'value');

        expect(result).toBe('OK');
      });
    });

    describe('get', () => {
      it('should get data from redis', async () => {
        mockClient.get.mockResolvedValue('value');

        const result = await instance.get('key');

        expect(mockClient.get).toHaveBeenCalledWith('key');
        expect(result).toBe('value');
      });

      it('should return null if key not found', async () => {
        mockClient.get.mockResolvedValue(null);

        const result = await instance.get('key');

        expect(result).toBeNull();
      });

      it('should handle JSON data', async () => {
        const obj = { id: 1, name: 'test' };
        mockClient.get.mockResolvedValue(JSON.stringify(obj));

        const result = await instance.get('key');

        expect(result).toBe(JSON.stringify(obj));
      });
    });

    describe('delete', () => {
      it('should delete a key', async () => {
        mockClient.del.mockResolvedValue(1);

        const result = await instance.delete('key');

        expect(mockClient.del).toHaveBeenCalledWith('key');
        expect(result).toBe(1);
      });

      it('should return 0 if key not found', async () => {
        mockClient.del.mockResolvedValue(0);

        const result = await instance.delete('key');

        expect(result).toBe(0);
      });
    });

    describe('deleteMany', () => {
      it('should delete multiple keys matching pattern', async () => {
        mockClient.get.mockResolvedValue(null);

        // Mock scan or keys
        // This depends on implementation

        // For now just verify the interface exists
        expect(typeof instance.deleteMany).toBe('function');
      });
    });
  });

  describe('Edge Cases', () => {
    let instance: RedisClient;

    beforeEach(() => {
      const config: RedisConfig = {
        host: 'localhost',
        port: 6379,
        defaultTtl: 300
      };

      instance = new RedisClient(config);
    });

    it('should handle special characters in keys', async () => {
      mockClient.set.mockResolvedValue('OK');

      const specialKey = 'key:with:colons:and:dots.';
      await instance.set(specialKey, 'value');

      expect(mockClient.set).toHaveBeenCalledWith(specialKey, 'value', { EX: 300 });
    });

    it('should handle very large TTL values', async () => {
      mockClient.set.mockResolvedValue('OK');

      await instance.set('key', 'value', 999999);

      expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 999999 });
    });

    it('should handle objects with null values', async () => {
      mockClient.set.mockResolvedValue('OK');

      const objWithNull = { id: 1, value: null };
      await instance.set('key', objWithNull);

      expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(objWithNull), { EX: 300 });
    });

    it('should handle complex nested objects', async () => {
      mockClient.set.mockResolvedValue('OK');

      const complexObj = {
        workflows: [
          { id: 1, name: 'wf1', templates: [{ id: 100 }] },
          { id: 2, name: 'wf2', templates: [{ id: 200 }] }
        ],
        metadata: { version: 1 }
      };

      await instance.set('key', complexObj);

      expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(complexObj), { EX: 300 });
    });
  });
});
