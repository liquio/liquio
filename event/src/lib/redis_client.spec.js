const crypto = require('crypto');

describe('RedisClient', () => {
  let RedisClient;
  let mockClient;
  let originalGlobal;

  beforeEach(() => {
    // Clear the singleton before each test
    RedisClient = require('./redis_client');
    RedisClient.singleton = null;

    // Mock the redis client with v5 Promise API
    /** @type {!Partial<import('redis').RedisClientType>} */
    mockClient = {
      connect: jest.fn().mockReturnValue(Promise.resolve(undefined)),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(0),
      keys: jest.fn().mockResolvedValue([]),
      scan: jest.fn().mockResolvedValue([0, []]),
    };

    // Mock the redis.createClient
    jest.spyOn(require('redis'), 'createClient').mockReturnValue(mockClient);

    // Mock global config
    originalGlobal = global.config;
    global.config = {
      redis: {
        host: 'localhost',
        port: 6379,
        ttl: 300,
      },
    };

    // Mock global log
    global.log = {
      save: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    if (originalGlobal) {
      global.config = originalGlobal;
    }
  });

  describe('Constructor', () => {
    it('should compile without errors', () => {
      expect(RedisClient).toBeDefined();
      expect(typeof RedisClient).toBe('function');
    });

    it('should create a singleton instance', () => {
      const instance1 = new RedisClient();
      const instance2 = new RedisClient();

      expect(instance1).toBe(instance2);
    });

    it('should read config from global.config.redis', () => {
      new RedisClient();

      expect(require('redis').createClient).toHaveBeenCalledWith({
        socket: { host: 'localhost', port: 6379 },
      });
    });

    it('should call connect on the client', () => {
      new RedisClient();

      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should set default TTL from global.config.redis', () => {
      const instance = new RedisClient();
      expect(instance.defaultTtl).toBe(300);
    });

    it('should use custom TTL from global.config.redis.ttl', () => {
      global.config.redis.ttl = 600;
      const instance = new RedisClient();

      expect(instance.defaultTtl).toBe(600);
    });

    it('should fallback to DEFAULT_TTL_IN_SECONDS if ttl not provided', () => {
      global.config.redis.ttl = undefined;
      const instance = new RedisClient();

      expect(instance.defaultTtl).toBe(300);
    });

    it('should set static prefix from npm_package_name', () => {
      new RedisClient();
      expect(RedisClient.prefix).toBe('liquio-event');
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
        new RedisClient();

        const cachedData = { id: 1, name: 'cached' };
        mockClient.get.mockResolvedValueOnce(JSON.stringify(cachedData));

        const fn = jest.fn();
        const result = await RedisClient.getOrSet('test-key', fn);

        expect(result).toEqual({ data: cachedData, isFromCache: true });
        expect(fn).not.toHaveBeenCalled();
      });

      it('should call function if cache miss', async () => {
        new RedisClient();

        const freshData = { id: 2, name: 'fresh' };
        const fn = jest.fn().mockResolvedValue(freshData);

        const result = await RedisClient.getOrSet('test-key', fn);

        expect(result).toEqual({ data: freshData, isFromCache: false });
        expect(fn).toHaveBeenCalled();
      });

      it('should handle null data', async () => {
        new RedisClient();

        const fn = jest.fn().mockResolvedValue(null);
        const result = await RedisClient.getOrSet('test-key', fn);

        expect(result).toEqual({ data: null, isFromCache: false });
      });

      it('should handle undefined data', async () => {
        new RedisClient();

        const fn = jest.fn().mockResolvedValue(undefined);
        const result = await RedisClient.getOrSet('test-key', fn);

        expect(result).toEqual({ data: undefined, isFromCache: false });
      });

      it('should work without redis client', async () => {
        RedisClient.singleton = null;

        const freshData = { id: 1 };
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
        new RedisClient();

        const freshData = { id: 1 };
        const timeFn = jest.fn().mockResolvedValue(new Date());
        const setFn = jest.fn().mockResolvedValue(freshData);

        const result = await RedisClient.getOrSetWithTimestamp('key', timeFn, setFn);

        expect(result).toEqual({ data: freshData, isFromCache: false });
      });

      it('should invalidate cache if new timestamp is later', async () => {
        new RedisClient();

        const oldTimestamp = new Date('2024-01-01');
        const newTimestamp = new Date('2024-01-02');

        mockClient.get
          .mockResolvedValueOnce(JSON.stringify(oldTimestamp))
          .mockResolvedValueOnce(null);

        const timeFn = jest.fn().mockResolvedValue(newTimestamp);
        const setFn = jest.fn().mockResolvedValue({ id: 1 });

        await RedisClient.getOrSetWithTimestamp('key', timeFn, setFn);

        expect(mockClient.del).toHaveBeenCalledWith('key');
      });

      it('should handle timestamp comparison correctly', async () => {
        new RedisClient();

        const sameTimestamp = new Date('2024-01-01');
        mockClient.get.mockResolvedValueOnce(JSON.stringify(sameTimestamp));

        const timeFn = jest.fn().mockResolvedValue(sameTimestamp);
        const setFn = jest.fn().mockResolvedValue({ id: 1 });

        await RedisClient.getOrSetWithTimestamp('key', timeFn, setFn);

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
      instance = new RedisClient();
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
        await instance.set('key', 'value');

        expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 300 });
      });

      it('should return OK on success', async () => {
        mockClient.set.mockResolvedValueOnce('OK');
        const result = await instance.set('key', 'value');

        expect(result).toBe('OK');
      });
    });

    describe('get', () => {
      it('should get data from redis', async () => {
        mockClient.get.mockResolvedValueOnce('value');
        const result = await instance.get('key');

        expect(result).toBe('value');
        expect(mockClient.get).toHaveBeenCalledWith('key');
      });

      it('should return null if key not found', async () => {
        mockClient.get.mockResolvedValueOnce(null);
        const result = await instance.get('key');

        expect(result).toBeNull();
      });

      it('should handle JSON data', async () => {
        const obj = { id: 1, name: 'test' };
        mockClient.get.mockResolvedValueOnce(JSON.stringify(obj));
        const result = await instance.get('key');

        expect(result).toBe(JSON.stringify(obj));
      });
    });

    describe('delete', () => {
      it('should delete a key', async () => {
        mockClient.del.mockResolvedValueOnce(1);
        const result = await instance.delete('key');

        expect(result).toBe(1);
        expect(mockClient.del).toHaveBeenCalledWith('key');
      });

      it('should return 0 if key not found', async () => {
        mockClient.del.mockResolvedValueOnce(0);
        const result = await instance.delete('key');

        expect(result).toBe(0);
      });
    });

    describe('getKeys', () => {
      it('should get keys matching pattern', async () => {
        const keys = ['key1', 'key2', 'key3'];
        mockClient.keys.mockResolvedValueOnce(keys);

        const result = await instance.getKeys('key*');

        expect(result).toEqual(keys);
        expect(mockClient.keys).toHaveBeenCalledWith('key*');
      });

      it('should return empty array if no keys match', async () => {
        mockClient.keys.mockResolvedValueOnce([]);
        const result = await instance.getKeys('nonexistent*');

        expect(result).toEqual([]);
      });
    });

    describe('scan', () => {
      it('should scan keys with pattern', async () => {
        const scanResult = ['0', ['key1', 'key2']];
        mockClient.scan.mockResolvedValueOnce(scanResult);

        const result = await instance.scan(0, 'key*', 10);

        expect(result).toEqual(scanResult);
        expect(mockClient.scan).toHaveBeenCalledWith(0, { MATCH: 'key*', COUNT: 10 });
      });

      it('should use default cursor and count', async () => {
        const scanResult = ['0', []];
        mockClient.scan.mockResolvedValueOnce(scanResult);

        await instance.scan(0, 'pattern');

        expect(mockClient.scan).toHaveBeenCalledWith(0, { MATCH: 'pattern', COUNT: 10 });
      });
    });

    describe('deleteMany', () => {
      it('should delete multiple keys matching pattern', async () => {
        const keys = ['key1', 'key2', 'key3'];
        mockClient.keys.mockResolvedValueOnce(keys);
        mockClient.del.mockResolvedValueOnce(3);

        const result = await instance.deleteMany('key*');

        expect(result).toBe(3);
        expect(mockClient.keys).toHaveBeenCalledWith('key*');
        expect(mockClient.del).toHaveBeenCalledWith(keys);
      });

      it('should return 0 if no keys match pattern', async () => {
        mockClient.keys.mockResolvedValueOnce([]);
        const result = await instance.deleteMany('nonexistent*');

        expect(result).toBe(0);
        expect(mockClient.del).not.toHaveBeenCalled();
      });

      it('should handle partial deletions', async () => {
        const keys = ['key1', 'key2', 'key3'];
        mockClient.keys.mockResolvedValueOnce(keys);
        mockClient.del.mockResolvedValueOnce(2);

        const result = await instance.deleteMany('key*');

        expect(result).toBe(2);
      });
    });

    describe('getObject', () => {
      it('should parse JSON data from redis', async () => {
        const obj = { id: 1, name: 'test' };
        mockClient.get.mockResolvedValueOnce(JSON.stringify(obj));

        const result = await instance.getObject('key');

        expect(result).toEqual(obj);
        expect(mockClient.get).toHaveBeenCalledWith('key');
      });

      it('should handle null data', async () => {
        mockClient.get.mockResolvedValueOnce(null);

        const result = await instance.getObject('key');

        expect(result).toBeNull();
      });

      it('should log and throw on JSON parse error', async () => {
        const invalidJson = 'not valid json';
        mockClient.get.mockResolvedValueOnce(invalidJson);

        await expect(instance.getObject('key')).rejects.toThrow();
        expect(global.log.save).toHaveBeenCalledWith(
          'redis-parse-object-error',
          expect.objectContaining({
            key: 'key',
            data: invalidJson,
          })
        );
      });
    });
  });

  describe('Edge Cases', () => {
    let instance;

    beforeEach(() => {
      instance = new RedisClient();
    });

    it('should handle special characters in keys', async () => {
      const specialKey = 'key:with:colons:and:dots.';
      mockClient.set.mockResolvedValueOnce('OK');

      await instance.set(specialKey, 'value');

      expect(mockClient.set).toHaveBeenCalledWith(specialKey, 'value', { EX: 300 });
    });

    it('should handle empty string values', async () => {
      await instance.set('key', '');

      expect(mockClient.set).toHaveBeenCalledWith('key', '', { EX: 300 });
    });

    it('should handle very large TTL values', async () => {
      await instance.set('key', 'value', 999999);

      expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 999999 });
    });

    it('should handle null values in objects', async () => {
      const objWithNull = { id: 1, value: null };
      await instance.set('key', objWithNull);

      expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(objWithNull), { EX: 300 });
    });
  });
});
