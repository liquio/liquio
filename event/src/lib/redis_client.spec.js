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
      set: jest.fn((key, data, ex, ttl, cb) => cb(null, 'OK')),
      get: jest.fn((key, cb) => cb(null, null)),
      del: jest.fn((key, cb) => cb(null, 0)),
      keys: jest.fn((pattern, cb) => cb(null, [])),
      scan: jest.fn((cursor, ...args) => {
        const cb = args[args.length - 1];
        cb(null, [0, []]);
      }),
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
        host: 'localhost',
        port: 6379,
      });
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
      const instance = new RedisClient();
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
        RedisClient.prefix = 'event-service';
        const key = RedisClient.createKey('user', 'profile');

        expect(key).toBe('event-service.user.profile');
      });

      it('should hash object arguments', () => {
        RedisClient.prefix = 'event-service';
        const obj = { id: 1, name: 'test' };
        const key = RedisClient.createKey('data', obj);

        const expectedHash = crypto
          .createHash('md5')
          .update(JSON.stringify(obj))
          .digest('hex');

        expect(key).toContain('event-service.data.');
        expect(key).toContain(expectedHash);
      });

      it('should handle mixed arguments', () => {
        RedisClient.prefix = 'event-service';
        const obj = { id: 1 };
        const key = RedisClient.createKey('prefix', obj, 'suffix');

        expect(key).toContain('event-service');
        expect(key).toContain('prefix');
        expect(key).toContain('suffix');
      });

      it('should handle numeric arguments', () => {
        RedisClient.prefix = 'event-service';
        const key = RedisClient.createKey('cache', 123);

        expect(key).toBe('event-service.cache.123');
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
        mockClient.get.mockImplementation((key, cb) => cb(null, JSON.stringify(cachedData)));

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
        const timeFn = jest.fn().mockResolvedValue(new Date('2024-01-02'));
        const setFn = jest.fn().mockResolvedValue(freshData);

        mockClient.get.mockImplementation((key, cb) => cb(null, null));

        const result = await RedisClient.getOrSetWithTimestamp('key', timeFn, setFn);

        expect(result).toEqual({ data: freshData, isFromCache: false });
      });

      it('should invalidate cache if new timestamp is later', async () => {
        new RedisClient();

        const oldTimestamp = new Date('2024-01-01');
        const newTimestamp = new Date('2024-01-02');

        let getCallCount = 0;
        mockClient.get.mockImplementation((key, cb) => {
          if (getCallCount === 0) {
            getCallCount++;
            cb(null, JSON.stringify(oldTimestamp));
          } else {
            cb(null, null);
          }
        });

        const timeFn = jest.fn().mockResolvedValue(newTimestamp);
        const setFn = jest.fn().mockResolvedValue({ id: 1 });

        await RedisClient.getOrSetWithTimestamp('key', timeFn, setFn);

        expect(mockClient.del).toHaveBeenCalled();
      });

      it('should use cache if timestamp is same', async () => {
        new RedisClient();

        const sameTimestamp = new Date('2024-01-01');
        const cachedData = { id: 1, name: 'cached' };

        let getCallCount = 0;
        mockClient.get.mockImplementation((key, cb) => {
          if (getCallCount === 0) {
            getCallCount++;
            cb(null, JSON.stringify(sameTimestamp));
          } else {
            cb(null, JSON.stringify(cachedData));
          }
        });

        const timeFn = jest.fn().mockResolvedValue(sameTimestamp);
        const setFn = jest.fn();

        const result = await RedisClient.getOrSetWithTimestamp('key', timeFn, setFn);

        expect(result.isFromCache).toBe(true);
        expect(setFn).not.toHaveBeenCalled();
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
      it('should set string data with callback pattern', (done) => {
        mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
          cb(null, 'OK');
        });

        instance.set('key', 'value').then((result) => {
          expect(result).toBe('OK');
          expect(mockClient.set).toHaveBeenCalledWith('key', 'value', 'EX', 300, expect.any(Function));
          done();
        });
      });

      it('should stringify object data', (done) => {
        const obj = { id: 1, name: 'test' };
        mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
          cb(null, 'OK');
        });

        instance.set('key', obj).then(() => {
          expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(obj), 'EX', 300, expect.any(Function));
          done();
        });
      });

      it('should use provided TTL', (done) => {
        mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
          cb(null, 'OK');
        });

        instance.set('key', 'value', 600).then(() => {
          expect(mockClient.set).toHaveBeenCalledWith('key', 'value', 'EX', 600, expect.any(Function));
          done();
        });
      });

      it('should reject on error', (done) => {
        const error = new Error('Connection failed');
        mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
          cb(error);
        });

        instance.set('key', 'value').catch((err) => {
          expect(err).toBe(error);
          done();
        });
      });
    });

    describe('get', () => {
      it('should get data from redis', (done) => {
        mockClient.get.mockImplementation((key, cb) => {
          cb(null, 'value');
        });

        instance.get('key').then((result) => {
          expect(result).toBe('value');
          expect(mockClient.get).toHaveBeenCalledWith('key', expect.any(Function));
          done();
        });
      });

      it('should return null if key not found', (done) => {
        mockClient.get.mockImplementation((key, cb) => {
          cb(null, null);
        });

        instance.get('key').then((result) => {
          expect(result).toBeNull();
          done();
        });
      });

      it('should reject on error', (done) => {
        const error = new Error('Connection failed');
        mockClient.get.mockImplementation((key, cb) => {
          cb(error);
        });

        instance.get('key').catch((err) => {
          expect(err).toBe(error);
          done();
        });
      });
    });

    describe('delete', () => {
      it('should delete a key', (done) => {
        mockClient.del.mockImplementation((key, cb) => {
          cb(null, 1);
        });

        instance.delete('key').then((result) => {
          expect(result).toBe(1);
          expect(mockClient.del).toHaveBeenCalledWith('key', expect.any(Function));
          done();
        });
      });

      it('should return 0 if key not found', (done) => {
        mockClient.del.mockImplementation((key, cb) => {
          cb(null, 0);
        });

        instance.delete('key').then((result) => {
          expect(result).toBe(0);
          done();
        });
      });

      it('should reject on error', (done) => {
        const error = new Error('Connection failed');
        mockClient.del.mockImplementation((key, cb) => {
          cb(error);
        });

        instance.delete('key').catch((err) => {
          expect(err).toBe(error);
          done();
        });
      });
    });

    describe('getKeys', () => {
      it('should get keys matching pattern', (done) => {
        const keys = ['key1', 'key2', 'key3'];
        mockClient.keys.mockImplementation((pattern, cb) => {
          cb(null, keys);
        });

        instance.getKeys('key*').then((result) => {
          expect(result).toEqual(keys);
          expect(mockClient.keys).toHaveBeenCalledWith('key*', expect.any(Function));
          done();
        });
      });

      it('should return empty array if no keys match', (done) => {
        mockClient.keys.mockImplementation((pattern, cb) => {
          cb(null, []);
        });

        instance.getKeys('nonexistent*').then((result) => {
          expect(result).toEqual([]);
          done();
        });
      });

      it('should reject on error', (done) => {
        const error = new Error('Connection failed');
        mockClient.keys.mockImplementation((pattern, cb) => {
          cb(error);
        });

        instance.getKeys('key*').catch((err) => {
          expect(err).toBe(error);
          done();
        });
      });
    });

    describe('scan', () => {
      it('should perform scan operation', (done) => {
        const scanResult = [1, ['key1', 'key2']];
        mockClient.scan.mockImplementation((cursor, ...args) => {
          const cb = args[args.length - 1];
          cb(null, scanResult);
        });

        instance.scan(0, 'key*', 10).then((result) => {
          expect(result).toEqual(scanResult);
          done();
        });
      });

      it('should use default cursor of 0', (done) => {
        const scanResult = [1, ['key1']];
        mockClient.scan.mockImplementation((cursor, ...args) => {
          expect(cursor).toBe(0);
          const cb = args[args.length - 1];
          cb(null, scanResult);
        });

        instance.scan(undefined, 'pattern', 10).then(() => {
          done();
        });
      });

      it('should use default count of 10', (done) => {
        const scanResult = [0, []];
        mockClient.scan.mockImplementation((cursor, ...args) => {
          // Verify COUNT argument
          expect(args).toContain(10);
          const cb = args[args.length - 1];
          cb(null, scanResult);
        });

        instance.scan(0, 'pattern').then(() => {
          done();
        });
      });

      it('should reject on error', (done) => {
        const error = new Error('Scan failed');
        mockClient.scan.mockImplementation((cursor, ...args) => {
          const cb = args[args.length - 1];
          cb(error);
        });

        instance.scan(0, 'pattern').catch((err) => {
          expect(err).toBe(error);
          done();
        });
      });
    });

    describe('deleteMany', () => {
      it('should delete multiple keys matching pattern', async () => {
        const keys = ['key1', 'key2', 'key3'];
        mockClient.keys.mockImplementation((pattern, cb) => {
          cb(null, keys);
        });
        mockClient.del.mockImplementation((keyArray, cb) => {
          cb(null, 3);
        });

        const result = await instance.deleteMany('key*');

        expect(result).toBe(3);
        expect(mockClient.keys).toHaveBeenCalledWith('key*', expect.any(Function));
        expect(mockClient.del).toHaveBeenCalledWith(keys, expect.any(Function));
      });

      it('should return 0 if no keys match pattern', async () => {
        mockClient.keys.mockImplementation((pattern, cb) => {
          cb(null, []);
        });

        const result = await instance.deleteMany('nonexistent*');

        expect(result).toBe(0);
        expect(mockClient.del).not.toHaveBeenCalled();
      });

      it('should reject on getKeys error', async () => {
        const error = new Error('Connection failed');
        mockClient.keys.mockImplementation((pattern, cb) => {
          cb(error);
        });

        try {
          await instance.deleteMany('pattern');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBe(error);
        }
      });
    });

    describe('getObject', () => {
      it('should parse JSON data from redis', async () => {
        const obj = { id: 1, name: 'test' };
        mockClient.get.mockImplementation((key, cb) => {
          cb(null, JSON.stringify(obj));
        });

        const result = await instance.getObject('key');

        expect(result).toEqual(obj);
      });

      it('should log and throw on parse error', async () => {
        mockClient.get.mockImplementation((key, cb) => {
          cb(null, 'invalid json');
        });

        try {
          await instance.getObject('key');
          fail('Should have thrown');
        } catch (error) {
          expect(global.log.save).toHaveBeenCalledWith(
            'redis-parse-object-error',
            expect.objectContaining({
              key: 'key',
              data: 'invalid json',
            })
          );
        }
      });

      it('should reject on get error', async () => {
        const error = new Error('Connection failed');
        mockClient.get.mockImplementation((key, cb) => {
          cb(error);
        });

        try {
          await instance.getObject('key');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBe(error);
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in keys', async () => {
      const instance = new RedisClient();
      const specialKey = 'key:with:colons:and:dots.';

      mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
        cb(null, 'OK');
      });

      await instance.set(specialKey, 'value');

      expect(mockClient.set).toHaveBeenCalledWith(specialKey, 'value', 'EX', 300, expect.any(Function));
    });

    it('should handle very large TTL values', async () => {
      const instance = new RedisClient();
      mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
        cb(null, 'OK');
      });

      await instance.set('key', 'value', 999999);

      expect(mockClient.set).toHaveBeenCalledWith('key', 'value', 'EX', 999999, expect.any(Function));
    });

    it('should handle objects with null values', async () => {
      const instance = new RedisClient();
      const objWithNull = { id: 1, value: null };

      mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
        cb(null, 'OK');
      });

      await instance.set('key', objWithNull);

      expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(objWithNull), 'EX', 300, expect.any(Function));
    });

    it('should handle complex nested objects', async () => {
      const instance = new RedisClient();
      const complexObj = {
        users: [
          { id: 1, name: 'Alice', tags: ['admin', 'user'] },
          { id: 2, name: 'Bob', tags: ['user'] },
        ],
        metadata: { created: '2024-01-01', version: 1 },
      };

      mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
        cb(null, 'OK');
      });

      await instance.set('key', complexObj);

      expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(complexObj), 'EX', 300, expect.any(Function));
    });
  });
});
