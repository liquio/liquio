const crypto = require('crypto');
const redis = require('redis');

const DEFAULT_TTL_IN_SECONDS = 300; // 5 minutes.

/**
 * Redis client.
 */
class RedisClient {
  /**
   * Redis client constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Singleton.
    if (!RedisClient.singleton) {
      const { host, port, defaultTtl } = config;
      this.client = redis.createClient({ socket: { host, port } });
      this.defaultTtl = defaultTtl || DEFAULT_TTL_IN_SECONDS;

      this.client.on('ready', () => {
        log.save('redis-connected');
      });

      this.client.on('error', (error) => {
        log.save('redis-error', error, 'error');
      });

      this.client.connect();

      // Define singleton.
      RedisClient.singleton = this;
      RedisClient.prefix = process.env.npm_package_name || 'cabinet-api';
    }

    // Return singleton.
    return RedisClient.singleton;
  }

  /**
   * Create a hash key from provided arguments. Objects will be hashed.
   * @param {any[]} args Arguments.
   * @return {string} Hash key.
   **/
  static createKey(...args) {
    const parts = [RedisClient.prefix, ...args];

    return parts.map((item) => (typeof item === 'object' ? crypto.createHash('md5').update(JSON.stringify(item)).digest('hex') : item)).join('.');
  }

  /**
   * Set-or-get data by key from redis using provided function.
   * @param {string} key Key for data.
   * @param {function} fn Async function to get data.
   * @param {number} ttl Time to live in seconds (optional).
   * @return {Promise<{ data: object, isFromCache: boolean }>} Data.
   **/
  static async getOrSet(key, fn, ttl = undefined) {
    let redis = RedisClient.singleton;

    if (redis) {
      const data = await redis.get(key);
      if (data) {
        return { data: JSON.parse(data), isFromCache: true };
      }
    }

    const data = await fn();

    if (redis) {
      await redis.set(key, JSON.stringify(data), ttl);
    }

    return { data, isFromCache: false };
  }

  /**
   * Set-or-get data by key from redis using provided function and timestamp.
   * @param {string} key Key for data.
   * @param {function} timeFn Async function to get timestamp.
   * @param {function} setFn Async function to set data.
   * @param {number} ttl Time to live in seconds (optional).
   * @return {Promise<{ data: object, isFromCache: boolean }>} Data.
   **/
  static async getOrSetWithTimestamp(key, timeFn, setFn, ttl = undefined) {
    let redis = RedisClient.singleton;

    if (!redis) {
      return { data: await setFn(), isFromCache: false };
    }

    // Get payload timestamp and new timestamp.
    const [oldTimestamp, newTimestamp] = await Promise.all([redis.get(key + '.timestamp').then(JSON.parse), timeFn()]);

    // Invalidate cache if needed.
    if (!oldTimestamp || new Date(newTimestamp) > new Date(oldTimestamp)) {
      redis.delete(key);
    }

    await redis.set(key + '.timestamp', newTimestamp);

    return RedisClient.getOrSet(key, setFn, ttl);
  }

  /**
   * Set data to redis.
   * @param {string} key Key for data.
   * @param {object|string} data Data to set.
   * @param {number} ttl Time to live.
   * @return {Promise<string>} OK.
   */
  set(key, data, ttl = this.defaultTtl) {
    if (typeof data === 'object') data = JSON.stringify(data);
    return this.client.set(key, data, { EX: ttl });
  }

  /**
   * Get data from redis.
   * @param {string} key Key for data.
   * @return {Promise<string>}.
   */
  async get(key) {
    return this.client.get(key);
  }

  /**
   * Delete data from redis.
   * @param {string} key Key for data.
   * @return {Promise<number>} Deleted keys.
   */
  async delete(key) {
    return this.client.del(key);
  }

  /**
   * @private
   * @param {string} pattern
   * @return {Promise<string[]>}
   */
  async getKeys(pattern) {
    return this.client.keys(pattern);
  }

  /**
   * @param {string} pattern
   * @return {Promise<number>}
   */
  async deleteMany(pattern) {
    const keys = await this.getKeys(pattern);

    if (!keys.length) {
      return 0;
    }

    return this.client.del(keys);
  }
}

module.exports = RedisClient;
