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
      const config = { host: 'localhost', port: 6379, defaultTtl: 300 };
      const instance1 = new RedisClient(config);
      const instance2 = new RedisClient(config);

      expect(instance1).toBe(instance2);
    });

    it('should connect to redis with provided host and port', () => {
      const config = { host: 'localhost', port: 6379, defaultTtl: 300 };
      new RedisClient(config);

      expect(require('redis').createClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
      });
    });

    it('should set default TTL from config', () => {
      const config = { host: 'localhost', port: 6379, defaultTtl: 600 };
      const instance = new RedisClient(config);

      expect(instance.defaultTtl).toBe(600);
    });

    it('should handle undefined default TTL', () => {
      const config = { host: 'localhost', port: 6379 };
      const instance = new RedisClient(config);

      expect(instance.defaultTtl).toBeUndefined();
    });
  });

  describe('Instance Methods', () => {
    let instance;

    beforeEach(() => {
      const config = { host: 'localhost', port: 6379, defaultTtl: 300 };
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

      it('should use default TTL if not provided', (done) => {
        mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
          cb(null, 'OK');
        });

        instance.set('key', 'value').then(() => {
          expect(mockClient.set).toHaveBeenCalledWith('key', 'value', 'EX', 300, expect.any(Function));
          done();
        });
      });

      it('should return OK on success', (done) => {
        mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
          cb(null, 'OK');
        });

        instance.set('key', 'value').then((result) => {
          expect(result).toBe('OK');
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

      it('should handle empty string values', (done) => {
        mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
          cb(null, 'OK');
        });

        instance.set('key', '').then(() => {
          expect(mockClient.set).toHaveBeenCalledWith('key', '', 'EX', 300, expect.any(Function));
          done();
        });
      });

      it('should handle objects with null values', (done) => {
        const objWithNull = { id: 1, value: null };
        mockClient.set.mockImplementation((key, data, ex, ttl, cb) => {
          cb(null, 'OK');
        });

        instance.set('key', objWithNull).then(() => {
          expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(objWithNull), 'EX', 300, expect.any(Function));
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

      it('should handle JSON data', (done) => {
        const obj = { id: 1, name: 'test' };
        mockClient.get.mockImplementation((key, cb) => {
          cb(null, JSON.stringify(obj));
        });

        instance.get('key').then((result) => {
          expect(result).toBe(JSON.stringify(obj));
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
  });

  describe('Edge Cases', () => {
    let instance;

    beforeEach(() => {
      const config = { host: 'localhost', port: 6379, defaultTtl: 300 };
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
        users: [
          { id: 1, name: 'Alice', tags: ['admin', 'user'] },
          { id: 2, name: 'Bob', tags: ['user'] },
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
