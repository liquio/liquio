const crypto = require('crypto');

describe('RedisClient', () => {
  let RedisClient;
  let mockClient;

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
    };

    // Mock the redis.createClient
    jest.spyOn(require('redis'), 'createClient').mockReturnValue(mockClient);
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
        host: 'localhost',
        port: 6379,
      });
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
      const config = { host: 'localhost', port: 6379 };
      new RedisClient(config);

      expect(RedisClient.prefix).toBe('liquio-task');
    });

    it('should use default prefix if npm_package_name is not set', () => {
      const config = { host: 'localhost', port: 6379 };
      new RedisClient(config);

      expect(RedisClient.prefix).toBe('liquio-task');
    });
  });

  describe('Static Methods', () => {
    describe('getInstance', () => {
      it('should be defined', () => {
        expect(RedisClient.getInstance).toBeDefined();
        expect(typeof RedisClient.getInstance).toBe('function');
      });

      it('should return singleton instance', () => {
        const config = { host: 'localhost', port: 6379 };
        const instance = new RedisClient(config);

        const retrieved = RedisClient.getInstance();
        expect(retrieved).toBe(instance);
      });

      it('should return undefined if not initialized', () => {
        RedisClient.singleton = null;
        const retrieved = RedisClient.getInstance();
        expect(retrieved).toBeNull();
      });
    });

    describe('createKey', () => {
      it('should be defined', () => {
        expect(RedisClient.createKey).toBeDefined();
        expect(typeof RedisClient.createKey).toBe('function');
      });

      it('should create a key with prefix and string arguments', () => {
        RedisClient.prefix = 'task-service';
        const key = RedisClient.createKey('workflow', '123');

        expect(key).toBe('task-service.workflow.123');
      });

      it('should hash object arguments', () => {
        RedisClient.prefix = 'task-service';
        const obj = { id: 1, name: 'test' };
        const key = RedisClient.createKey('data', obj);

        const expectedHash = crypto
          .createHash('md5')
          .update(JSON.stringify(obj))
          .digest('hex');

        expect(key).toContain('task-service.data.');
        expect(key).toContain(expectedHash);
      });

      it('should convert non-object args to strings', () => {
        RedisClient.prefix = 'task-service';
        const key = RedisClient.createKey('item', 123, 'status');

        expect(key).toBe('task-service.item.123.status');
      });

      it('should handle mixed arguments', () => {
        RedisClient.prefix = 'task-service';
        const obj = { id: 1 };
        const key = RedisClient.createKey('prefix', obj, 'suffix', 456);

        expect(key).toContain('task-service');
        expect(key).toContain('prefix');
        expect(key).toContain('suffix');
        expect(key).toContain('456');
      });

      it('should handle empty arguments', () => {
        RedisClient.prefix = 'task-service';
        const key = RedisClient.createKey();

        expect(key).toBe('task-service');
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
        mockClient.get.mockImplementation((key, cb) => cb(null, JSON.stringify(cachedData)));

        const fn = jest.fn();
        const result = await RedisClient.getOrSet('test-key', fn);

        expect(result).toEqual({ data: cachedData, isFromCache: true });
        expect(fn).not.toHaveBeenCalled();
      });

      it('should call function if cache miss', async () => {
        const config = { host: 'localhost', port: 6379 };
        new RedisClient(config);

        const freshData = { id: 2, name: 'fresh' };
        const fn = jest.fn().mockResolvedValue(freshData);

        const result = await RedisClient.getOrSet('test-key', fn);

        expect(result).toEqual({ data: freshData, isFromCache: false });
        expect(fn).toHaveBeenCalled();
      });

      it('should handle null data', async () => {
        const config = { host: 'localhost', port: 6379 };
        new RedisClient(config);

        const fn = jest.fn().mockResolvedValue(null);
        const result = await RedisClient.getOrSet('test-key', fn);

        expect(result).toEqual({ data: null, isFromCache: false });
      });

      it('should handle undefined data', async () => {
        const config = { host: 'localhost', port: 6379 };
        new RedisClient(config);

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
        const config = { host: 'localhost', port: 6379 };
        new RedisClient(config);

        const freshData = { id: 1 };
        const timeFn = jest.fn().mockResolvedValue(new Date('2024-01-02'));
        const setFn = jest.fn().mockResolvedValue(freshData);

        mockClient.get.mockImplementation((key, cb) => cb(null, null));

        const result = await RedisClient.getOrSetWithTimestamp('key', timeFn, setFn);

        expect(result).toEqual({ data: freshData, isFromCache: false });
      });

      it('should invalidate cache if new timestamp is later', async () => {
        const config = { host: 'localhost', port: 6379 };
        new RedisClient(config);

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
      it('should set string data', (done) => {
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

    describe('deleteMany', () => {
      it('should delete multiple keys matching pattern', (done) => {
        const keys = ['key1', 'key2', 'key3'];
        mockClient.keys.mockImplementation((pattern, cb) => {
          cb(null, keys);
        });
        mockClient.del.mockImplementation((keyArray, cb) => {
          cb(null, 3);
        });

        instance.deleteMany('key*').then((result) => {
          expect(result).toBe(3);
          expect(mockClient.keys).toHaveBeenCalledWith('key*', expect.any(Function));
          expect(mockClient.del).toHaveBeenCalledWith(keys, expect.any(Function));
          done();
        });
      });

      it('should return 0 if no keys match pattern', (done) => {
        mockClient.keys.mockImplementation((pattern, cb) => {
          cb(null, []);
        });

        instance.deleteMany('nonexistent*').then((result) => {
          expect(result).toBe(0);
          expect(mockClient.del).not.toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('Edge Cases', () => {
    let instance;

    beforeEach(() => {
      const config = { host: 'localhost', port: 6379 };
      instance = new RedisClient(config);
    });

    it('should handle special characters in keys', (done) => {
      const specialKey = 'key:with:colons:and:dots.';
      mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
        cb(null, 'OK');
      });

      instance.set(specialKey, 'value').then(() => {
        expect(mockClient.set).toHaveBeenCalledWith(specialKey, 'value', 'EX', 300, expect.any(Function));
        done();
      });
    });

    it('should handle very large TTL values', (done) => {
      mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
        cb(null, 'OK');
      });

      instance.set('key', 'value', 999999).then(() => {
        expect(mockClient.set).toHaveBeenCalledWith('key', 'value', 'EX', 999999, expect.any(Function));
        done();
      });
    });

    it('should handle complex nested objects', (done) => {
      const complexObj = {
        workflows: [
          { id: 1, name: 'wf1', tasks: [{ id: 100 }, { id: 101 }] },
          { id: 2, name: 'wf2', tasks: [{ id: 200 }] },
        ],
        metadata: { created: '2024-01-01', version: 1 },
      };

      mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
        cb(null, 'OK');
      });

      instance.set('key', complexObj).then(() => {
        expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(complexObj), 'EX', 300, expect.any(Function));
        done();
      });
    });
  });
});
