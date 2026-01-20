describe('RedisClient', () => {
  let RedisClient;
  let mockClient;

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

      // v5: createClient expects socket object
      expect(require('redis').createClient).toHaveBeenCalledWith({
        socket: { host: 'localhost', port: 6379 },
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
      it('should set string data', async () => {
        const config = { host: 'localhost', port: 6379, defaultTtl: 300 };
        const instance = new RedisClient(config);

        const result = await instance.set('key', 'value');

        // v5: set uses Promise API with options object
        expect(result).toBe('OK');
        expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 300 });
      });

      it('should stringify object data', async () => {
        const config = { host: 'localhost', port: 6379, defaultTtl: 300 };
        const instance = new RedisClient(config);
        const obj = { id: 1, name: 'test' };

        await instance.set('key', obj);

        expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(obj), { EX: 300 });
      });

      it('should use provided TTL', async () => {
        const config = { host: 'localhost', port: 6379, defaultTtl: 300 };
        const instance = new RedisClient(config);

        await instance.set('key', 'value', 600);

        expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 600 });
      });

      it('should use default TTL if not provided', async () => {
        const config = { host: 'localhost', port: 6379, defaultTtl: 300 };
        const instance = new RedisClient(config);

        await instance.set('key', 'value');

        expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 300 });
      });

      it('should return OK on success', async () => {
        const config = { host: 'localhost', port: 6379, defaultTtl: 300 };
        const instance = new RedisClient(config);

        const result = await instance.set('key', 'value');

        expect(result).toBe('OK');
      });

      it('should reject on error', async () => {
        const config = { host: 'localhost', port: 6379, defaultTtl: 300 };
        const instance = new RedisClient(config);
        const error = new Error('Connection failed');
        mockClient.set.mockRejectedValueOnce(error);

        await expect(instance.set('key', 'value')).rejects.toBe(error);
      });

      it('should handle empty string values', async () => {
        const config = { host: 'localhost', port: 6379, defaultTtl: 300 };
        const instance = new RedisClient(config);

        await instance.set('key', '');

        expect(mockClient.set).toHaveBeenCalledWith('key', '', { EX: 300 });
      });

      it('should handle objects with null values', async () => {
        const config = { host: 'localhost', port: 6379, defaultTtl: 300 };
        const instance = new RedisClient(config);
        const objWithNull = { id: 1, value: null };

        await instance.set('key', objWithNull);

        expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(objWithNull), { EX: 300 });
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

      it('should reject on error', async () => {
        const error = new Error('Connection failed');
        mockClient.get.mockRejectedValueOnce(error);

        await expect(instance.get('key')).rejects.toBe(error);
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

      it('should reject on error', async () => {
        const error = new Error('Connection failed');
        mockClient.del.mockRejectedValueOnce(error);

        await expect(instance.delete('key')).rejects.toBe(error);
      });
    });
  });

  describe('Edge Cases', () => {
    let instance;

    beforeEach(() => {
      const config = { host: 'localhost', port: 6379, defaultTtl: 300 };
      instance = new RedisClient(config);
    });

    it('should handle special characters in keys', async () => {
      const specialKey = 'key:with:colons:and:dots.';
      mockClient.set.mockResolvedValueOnce('OK');

      await instance.set(specialKey, 'value');

      expect(mockClient.set).toHaveBeenCalledWith(specialKey, 'value', { EX: 300 });
    });

    it('should handle very large TTL values', async () => {
      mockClient.set.mockResolvedValueOnce('OK');

      await instance.set('key', 'value', 999999);

      expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 999999 });
    });

    it('should handle complex nested objects', async () => {
      const complexObj = {
        users: [
          { id: 1, name: 'Alice', tags: ['admin', 'user'] },
          { id: 2, name: 'Bob', tags: ['user'] },
        ],
        metadata: { created: '2024-01-01', version: 1 },
      };

      mockClient.set.mockResolvedValueOnce('OK');

      await instance.set('key', complexObj);

      expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(complexObj), { EX: 300 });
    });
  });
});
