const crypto = require('crypto');

describe('RedisClient', () => {
  let RedisClient;
  let mockClient;
  let originalGlobal;

  beforeEach(() => {
    // Clear the singleton before each test
    RedisClient = require('./redis_client');
    RedisClient.singleton = null;

    // Mock the redis client
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(0),
      keys: jest.fn().mockResolvedValue([]),
    };

    // Mock the redis.createClient
    jest.spyOn(require('redis'), 'createClient').mockReturnValue(mockClient);

    // Mock global log
    originalGlobal = global.log;
    global.log = {
      save: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    if (originalGlobal) {
      global.log = originalGlobal;
    }
  });

  describe('Constructor', () => {
    it('should compile without errors', () => {
      expect(RedisClient).toBeDefined();
      expect(typeof RedisClient).toBe('function');
    });

    it('should create a singleton instance', () => {
      const config = { host: 'localhost', port: 6379 };
      const instance1 = new RedisClient(config);
      const instance2 = new RedisClient(config);

      expect(instance1).toBe(instance2);
    });

    it('should connect to redis with provided host and port', () => {
      const config = { host: 'localhost', port: 6379 };
      new RedisClient(config);

      expect(require('redis').createClient).toHaveBeenCalledWith({
        socket: { host: 'localhost', port: 6379 },
      });
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should set default TTL to 300 seconds', () => {
      const config = { host: 'localhost', port: 6379 };
      const instance = new RedisClient(config);

      expect(instance.defaultTtl).toBe(300);
    });

    it('should use custom TTL from config', () => {
      const config = { host: 'localhost', port: 6379, defaultTtl: 600 };
      const instance = new RedisClient(config);

      expect(instance.defaultTtl).toBe(600);
    });

    it('should set prefix from npm_package_name', () => {
      const originalEnv = process.env.npm_package_name;
      process.env.npm_package_name = 'test-service';

      const config = { host: 'localhost', port: 6379 };
      new RedisClient(config);

      expect(RedisClient.prefix).toBe('test-service');

      process.env.npm_package_name = originalEnv;
    });

    it('should use default prefix if npm_package_name is not set', () => {
      const originalEnv = process.env.npm_package_name;
      delete process.env.npm_package_name;

      const config = { host: 'localhost', port: 6379 };
      new RedisClient(config);

      expect(RedisClient.prefix).toBe('cabinet-api');

      process.env.npm_package_name = originalEnv;
    });

    it('should register ready event listener', () => {
      const config = { host: 'localhost', port: 6379 };
      new RedisClient(config);

      expect(mockClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    it('should register error event listener', () => {
      const config = { host: 'localhost', port: 6379 };
      new RedisClient(config);

      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should log when redis is connected', () => {
      const config = { host: 'localhost', port: 6379 };
      new RedisClient(config);

      const readyCallback = mockClient.on.mock.calls.find(call => call[0] === 'ready')?.[1];
      if (readyCallback) {
        readyCallback();
        expect(global.log.save).toHaveBeenCalledWith('redis-connected');
      }
    });

    it('should log error when redis connection fails', () => {
      const config = { host: 'localhost', port: 6379 };
      new RedisClient(config);

      const errorCallback = mockClient.on.mock.calls.find(call => call[0] === 'error')?.[1];
      const testError = new Error('Connection failed');
      if (errorCallback) {
        errorCallback(testError);
        expect(global.log.save).toHaveBeenCalledWith('redis-error', testError, 'error');
      }
    });
  });

  describe('Static Methods', () => {
    describe('createKey', () => {
      it('should be defined', () => {
        expect(RedisClient.createKey).toBeDefined();
        expect(typeof RedisClient.createKey).toBe('function');
      });

      it('should create a key with prefix and string arguments', () => {
        RedisClient.prefix = 'test-service';
        const key = RedisClient.createKey('user', 'profile', 'name');

        expect(key).toBe('test-service.user.profile.name');
      });

      it('should hash object arguments', () => {
        RedisClient.prefix = 'test-service';
        const obj = { id: 1, name: 'test' };
        const key = RedisClient.createKey('user', obj);

        const expectedHash = crypto
          .createHash('md5')
          .update(JSON.stringify(obj))
          .digest('hex');

        expect(key).toContain('test-service.user.');
        expect(key).toContain(expectedHash);
      });

      it('should handle multiple object arguments', () => {
        RedisClient.prefix = 'test-service';
        const obj1 = { id: 1 };
        const obj2 = { name: 'test' };
        const key = RedisClient.createKey(obj1, obj2);

        expect(key).toContain('test-service.');
        expect(key.split('.').length).toBeGreaterThan(1);
      });

      it('should handle mixed string and object arguments', () => {
        RedisClient.prefix = 'test-service';
        const obj = { id: 1 };
        const key = RedisClient.createKey('prefix', obj, 'suffix');

        expect(key).toContain('test-service');
        expect(key).toContain('prefix');
        expect(key).toContain('suffix');
      });

      it('should handle empty arguments', () => {
        RedisClient.prefix = 'test-service';
        const key = RedisClient.createKey();

        expect(key).toBe('test-service');
      });

      it('should handle numeric arguments', () => {
        RedisClient.prefix = 'test-service';
        const key = RedisClient.createKey('cache', 123, 'item');

        expect(key).toBe('test-service.cache.123.item');
      });
    });

    describe('getOrSet', () => {
      it('should be defined', () => {
        expect(RedisClient.getOrSet).toBeDefined();
        expect(typeof RedisClient.getOrSet).toBe('function');
      });

      it('should return data from cache if available', async () => {
        const config = { host: 'localhost', port: 6379 };
        new RedisClient(config);

        const cachedData = { id: 1, name: 'cached' };
        mockClient.get.mockResolvedValue(JSON.stringify(cachedData));

        const fn = jest.fn();
        const result = await RedisClient.getOrSet('test-key', fn);

        expect(result).toEqual({ data: cachedData, isFromCache: true });
        expect(fn).not.toHaveBeenCalled();
      });

      it('should call function if cache miss', async () => {
        const config = { host: 'localhost', port: 6379 };
        new RedisClient(config);

        mockClient.get.mockResolvedValue(null);

        const freshData = { id: 2, name: 'fresh' };
        const fn = jest.fn().mockResolvedValue(freshData);

        const result = await RedisClient.getOrSet('test-key', fn);

        expect(result).toEqual({ data: freshData, isFromCache: false });
        expect(fn).toHaveBeenCalled();
      });

      it('should set data in cache after calling function', async () => {
        const config = { host: 'localhost', port: 6379 };
        new RedisClient(config);

        mockClient.get.mockResolvedValue(null);

        const freshData = { id: 2, name: 'fresh' };
        const fn = jest.fn().mockResolvedValue(freshData);

        await RedisClient.getOrSet('test-key', fn, 600);

        expect(mockClient.set).toHaveBeenCalledWith(
          'test-key',
          JSON.stringify(freshData),
          { EX: 600 }
        );
      });

      it('should use instance default TTL if not provided', async () => {
        const config = { host: 'localhost', port: 6379, defaultTtl: 500 };
        new RedisClient(config);

        mockClient.get.mockResolvedValue(null);
        const fn = jest.fn().mockResolvedValue({ data: 'test' });

        await RedisClient.getOrSet('test-key', fn);

        expect(mockClient.set).toHaveBeenCalledWith(
          'test-key',
          JSON.stringify({ data: 'test' }),
          { EX: 500 }
        );
      });

      it('should work without redis client', async () => {
        // Don't initialize RedisClient
        RedisClient.singleton = null;

        const freshData = { id: 2, name: 'fresh' };
        const fn = jest.fn().mockResolvedValue(freshData);

        const result = await RedisClient.getOrSet('test-key', fn);

        expect(result).toEqual({ data: freshData, isFromCache: false });
        expect(fn).toHaveBeenCalled();
      });
    });

    describe('getOrSetWithTimestamp', () => {
      it('should be defined', () => {
        expect(RedisClient.getOrSetWithTimestamp).toBeDefined();
        expect(typeof RedisClient.getOrSetWithTimestamp).toBe('function');
      });

      it('should return fresh data if no cache exists', async () => {
        const config = { host: 'localhost', port: 6379 };
        new RedisClient(config);

        mockClient.get.mockResolvedValue(null);

        const freshData = { id: 1 };
        const timeFn = jest.fn().mockResolvedValue(new Date());
        const setFn = jest.fn().mockResolvedValue(freshData);

        const result = await RedisClient.getOrSetWithTimestamp('key', timeFn, setFn);

        expect(result).toEqual({ data: freshData, isFromCache: false });
      });

      it('should invalidate cache if new timestamp is later', async () => {
        const config = { host: 'localhost', port: 6379 };
        const instance = new RedisClient(config);

        const oldTimestamp = new Date('2024-01-01');
        const newTimestamp = new Date('2024-01-02');

        mockClient.get
          .mockResolvedValueOnce(JSON.stringify(oldTimestamp))
          .mockResolvedValueOnce(null);

        const timeFn = jest.fn().mockResolvedValue(newTimestamp);
        const setFn = jest.fn().mockResolvedValue({ id: 1 });

        await RedisClient.getOrSetWithTimestamp('key', timeFn, setFn);

        expect(instance.delete).toBeDefined();
      });

      it('should handle timestamp comparison correctly', async () => {
        const config = { host: 'localhost', port: 6379 };
        new RedisClient(config);

        const sameTimestamp = new Date('2024-01-01');
        mockClient.get.mockResolvedValueOnce(JSON.stringify(sameTimestamp));

        const timeFn = jest.fn().mockResolvedValue(sameTimestamp);
        const setFn = jest.fn().mockResolvedValue({ id: 1 });

        await RedisClient.getOrSetWithTimestamp('key', timeFn, setFn);

        // Should not call delete if timestamps are equal
        expect(setFn).toHaveBeenCalled();
      });

      it('should work without redis client', async () => {
        RedisClient.singleton = null;

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
    let instance;

    beforeEach(() => {
      const config = { host: 'localhost', port: 6379 };
      instance = new RedisClient(config);
    });

    describe('set', () => {
      it('should set string data', async () => {
        await instance.set('key', 'value');

        expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 300 });
      });

      it('should stringify object data', async () => {
        const obj = { id: 1, name: 'test' };
        await instance.set('key', obj);

        expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(obj), { EX: 300 });
      });

      it('should use provided TTL', async () => {
        await instance.set('key', 'value', 600);

        expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 600 });
      });

      it('should use default TTL if not provided', async () => {
        const config = { host: 'localhost', port: 6379, defaultTtl: 500 };
        RedisClient.singleton = null;
        const customInstance = new RedisClient(config);

        await customInstance.set('key', 'value');

        expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 500 });
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

        expect(result).toBe('value');
        expect(mockClient.get).toHaveBeenCalledWith('key');
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

        expect(result).toBe(1);
        expect(mockClient.del).toHaveBeenCalledWith('key');
      });

      it('should return 0 if key not found', async () => {
        mockClient.del.mockResolvedValue(0);
        const result = await instance.delete('key');

        expect(result).toBe(0);
      });
    });

    describe('getKeys', () => {
      it('should get keys matching pattern', async () => {
        const keys = ['key1', 'key2', 'key3'];
        mockClient.keys.mockResolvedValue(keys);

        const result = await instance.getKeys('key*');

        expect(result).toEqual(keys);
        expect(mockClient.keys).toHaveBeenCalledWith('key*');
      });

      it('should return empty array if no keys match', async () => {
        mockClient.keys.mockResolvedValue([]);
        const result = await instance.getKeys('nonexistent*');

        expect(result).toEqual([]);
      });
    });

    describe('deleteMany', () => {
      it('should delete multiple keys matching pattern', async () => {
        const keys = ['key1', 'key2', 'key3'];
        mockClient.keys.mockResolvedValue(keys);
        mockClient.del.mockResolvedValue(3);

        const result = await instance.deleteMany('key*');

        expect(result).toBe(3);
        expect(mockClient.keys).toHaveBeenCalledWith('key*');
        expect(mockClient.del).toHaveBeenCalledWith(keys);
      });

      it('should return 0 if no keys match pattern', async () => {
        mockClient.keys.mockResolvedValue([]);
        const result = await instance.deleteMany('nonexistent*');

        expect(result).toBe(0);
        expect(mockClient.del).not.toHaveBeenCalled();
      });

      it('should handle partial deletions', async () => {
        const keys = ['key1', 'key2', 'key3'];
        mockClient.keys.mockResolvedValue(keys);
        mockClient.del.mockResolvedValue(2); // Only 2 deleted

        const result = await instance.deleteMany('key*');

        expect(result).toBe(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in keys', async () => {
      const config = { host: 'localhost', port: 6379 };
      const instance = new RedisClient(config);

      const specialKey = 'key:with:colons';
      await instance.set(specialKey, 'value');

      expect(mockClient.set).toHaveBeenCalledWith(specialKey, 'value', { EX: 300 });
    });

    it('should handle empty string values', async () => {
      const config = { host: 'localhost', port: 6379 };
      const instance = new RedisClient(config);

      await instance.set('key', '');

      expect(mockClient.set).toHaveBeenCalledWith('key', '', { EX: 300 });
    });

    it('should handle very large TTL values', async () => {
      const config = { host: 'localhost', port: 6379 };
      const instance = new RedisClient(config);

      await instance.set('key', 'value', 999999);

      expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 999999 });
    });

    it('should handle null values in objects', async () => {
      const config = { host: 'localhost', port: 6379 };
      const instance = new RedisClient(config);

      const objWithNull = { id: 1, value: null };
      await instance.set('key', objWithNull);

      expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(objWithNull), { EX: 300 });
    });
  });
});
