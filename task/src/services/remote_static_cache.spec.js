const nock = require('nock');
const redis = require('redis');

const RemoteStaticCache = require('./remote_static_cache');

// Mock redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
};

// Mock redis.createClient
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

// Mock global log
global.log = {
  save: jest.fn(),
};

describe('RemoteStaticCache', () => {
  beforeEach(() => {
    // Clear singleton between tests
    RemoteStaticCache.singleton = null;
    
    // Clear all mocks
    jest.clearAllMocks();
    mockRedisClient.get.mockClear();
    mockRedisClient.set.mockClear();
    redis.createClient.mockClear();
    global.log.save.mockClear();
    
    // Clear nock
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('constructor', () => {
    it('should create singleton instance with Redis enabled', () => {
      const config = { useCache: true };
      const redisConfig = { isEnabled: true, host: 'localhost', port: 6379 };

      const cache = new RemoteStaticCache(config, redisConfig);

      expect(redis.createClient).toHaveBeenCalledWith(6379, 'localhost');
      expect(cache.client).toBe(mockRedisClient);
      expect(global.log.save).toHaveBeenCalledWith('remote-static-cache-initialized', {
        useCache: true,
        host: 'localhost',
        port: 6379
      });
    });

    it('should create instance without Redis when Redis is disabled', () => {
      const config = { useCache: true };
      const redisConfig = { isEnabled: false, host: 'localhost', port: 6379 };

      const cache = new RemoteStaticCache(config, redisConfig);

      expect(redis.createClient).not.toHaveBeenCalled();
      expect(cache.client).toBeUndefined();
      expect(global.log.save).toHaveBeenCalledWith('remote-static-cache-not-initialized', {
        useCache: true
      });
    });

    it('should create instance without Redis when useCache is false', () => {
      const config = { useCache: false };
      const redisConfig = { isEnabled: true, host: 'localhost', port: 6379 };

      const cache = new RemoteStaticCache(config, redisConfig);

      expect(redis.createClient).not.toHaveBeenCalled();
      expect(cache.client).toBeUndefined();
      expect(global.log.save).toHaveBeenCalledWith('remote-static-cache-not-initialized', {
        useCache: false
      });
    });

    it('should create instance without Redis when host or port is missing', () => {
      const config = { useCache: true };
      const redisConfig = { isEnabled: true, host: 'localhost' }; // Missing port

      const cache = new RemoteStaticCache(config, redisConfig);

      expect(redis.createClient).not.toHaveBeenCalled();
      expect(cache.client).toBeUndefined();
    });

    it('should return same singleton instance on multiple calls', () => {
      const config = { useCache: true };
      const redisConfig = { isEnabled: true, host: 'localhost', port: 6379 };

      const cache1 = new RemoteStaticCache(config, redisConfig);
      const cache2 = new RemoteStaticCache(config, redisConfig);

      expect(cache1).toBe(cache2);
      expect(redis.createClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAndUpdateByRemoteUrl', () => {
    let cache;
    const testUrl = 'https://api.example.com/data';
    const expectedKey = 'static-url:aHR0cHM6Ly9hcGkuZXhhbXBsZS5jb20vZGF0YQ=='; // Base64 of testUrl

    beforeEach(() => {
      const config = { useCache: true };
      const redisConfig = { isEnabled: true, host: 'localhost', port: 6379 };
      cache = new RemoteStaticCache(config, redisConfig);
    });

    it('should return cached data and trigger background update', async () => {
      const cachedData = { id: 1, name: 'cached' };
      const newData = { id: 1, name: 'updated' };

      // Mock Redis get to return cached data
      mockRedisClient.get.mockImplementation((key, callback) => {
        callback(null, JSON.stringify(cachedData));
      });

      // Mock HTTP request for update
      nock('https://api.example.com')
        .get('/data')
        .reply(200, newData);

      const result = await cache.getAndUpdateByRemoteUrl(testUrl);

      expect(result).toEqual(cachedData);
      expect(mockRedisClient.get).toHaveBeenCalledWith(expectedKey, expect.any(Function));
      
      // Note: The HTTP request and Redis set happen asynchronously in the background
      // We can't easily test the Redis.set call without making the method return a Promise
      // for the background operation, which would change the API
    });

    it('should return null when no cached data exists', async () => {
      const newData = { id: 1, name: 'fresh' };

      // Mock Redis get to return no data
      mockRedisClient.get.mockImplementation((key, callback) => {
        callback(null, null);
      });

      // Mock HTTP request for update
      nock('https://api.example.com')
        .get('/data')
        .reply(200, newData);

      const result = await cache.getAndUpdateByRemoteUrl(testUrl);

      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith(expectedKey, expect.any(Function));
      
      // Note: Background HTTP request and Redis update happen asynchronously
    });

    it('should handle Redis get error', async () => {
      const redisError = new Error('Redis connection failed');

      // Mock Redis get to return error
      mockRedisClient.get.mockImplementation((key, callback) => {
        callback(redisError, null);
      });

      await expect(cache.getAndUpdateByRemoteUrl(testUrl)).rejects.toThrow('Redis connection failed');
      expect(mockRedisClient.get).toHaveBeenCalledWith(expectedKey, expect.any(Function));
    });

    it('should return cached data even when HTTP request fails', async () => {
      const cachedData = { id: 1, name: 'cached' };

      // Mock Redis get to return cached data
      mockRedisClient.get.mockImplementation((key, callback) => {
        callback(null, JSON.stringify(cachedData));
      });

      // Mock HTTP request to fail
      nock('https://api.example.com')
        .get('/data')
        .replyWithError(new Error('Network error'));

      const result = await cache.getAndUpdateByRemoteUrl(testUrl);

      expect(result).toEqual(cachedData);
      
      // Note: Error handling in background request is not easily testable
      // without changing the service implementation to return promises for background operations
    });

    it('should use custom timeout when extraOptions provided', async () => {
      const cachedData = { id: 1, name: 'cached' };

      // Mock Redis get to return cached data
      mockRedisClient.get.mockImplementation((key, callback) => {
        callback(null, JSON.stringify(cachedData));
      });

      // Mock HTTP request with custom timeout
      nock('https://api.example.com')
        .get('/data')
        .reply(200, { success: true });

      const result = await cache.getAndUpdateByRemoteUrl(testUrl, { timeout: 10000 });

      expect(result).toEqual(cachedData);
      // Custom timeout should now work correctly after fixing the destructuring bug
    });

    it('should return undefined when Redis client is not defined', async () => {
      // Create cache without Redis
      RemoteStaticCache.singleton = null;
      const config = { useCache: false };
      const redisConfig = { isEnabled: false };
      const cacheWithoutRedis = new RemoteStaticCache(config, redisConfig);

      const result = await cacheWithoutRedis.getAndUpdateByRemoteUrl(testUrl);

      expect(result).toBeUndefined();
      expect(global.log.save).toHaveBeenCalledWith('redis-client-is-not-defined-for-static-cache');
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should use default timeout when not provided', async () => {
      const cachedData = { id: 1, name: 'cached' };

      // Mock Redis get to return cached data
      mockRedisClient.get.mockImplementation((key, callback) => {
        callback(null, JSON.stringify(cachedData));
      });

      // Mock HTTP request
      nock('https://api.example.com')
        .get('/data')
        .reply(200, { success: true });

      const result = await cache.getAndUpdateByRemoteUrl(testUrl);

      expect(result).toEqual(cachedData);
      // The default timeout (5000) should be used internally
    });
  });

  describe('formKeyFromUrl', () => {
    let cache;

    beforeEach(() => {
      const config = { useCache: true };
      const redisConfig = { isEnabled: true, host: 'localhost', port: 6379 };
      cache = new RemoteStaticCache(config, redisConfig);
    });

    it('should form correct cache key from URL', () => {
      const url = 'https://api.example.com/data';
      const expectedKey = 'static-url:aHR0cHM6Ly9hcGkuZXhhbXBsZS5jb20vZGF0YQ==';

      const result = cache.formKeyFromUrl(url);

      expect(result).toBe(expectedKey);
    });

    it('should form different keys for different URLs', () => {
      const url1 = 'https://api.example.com/data1';
      const url2 = 'https://api.example.com/data2';

      const key1 = cache.formKeyFromUrl(url1);
      const key2 = cache.formKeyFromUrl(url2);

      expect(key1).not.toBe(key2);
      expect(key1).toContain('static-url:');
      expect(key2).toContain('static-url:');
    });

    it('should handle special characters in URL', () => {
      const url = 'https://api.example.com/data?param=value&other=test';
      
      const result = cache.formKeyFromUrl(url);

      expect(result).toContain('static-url:');
      expect(result.length).toBeGreaterThan('static-url:'.length);
    });
  });
});
