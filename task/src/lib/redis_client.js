
const crypto = require('crypto');
const redis = require('redis');

const DEFAULT_TTL_IN_SECONDS = 300; // 5 minutes.

/**
 * Redis client.
 */
class RedisClient {
  static prefix = process.env.npm_package_name || 'bpmn-task';

  /**
   * Redis client constructor.
   * @param {object} config Config object.
  */
  constructor(config) {
    // Singleton.
    if (!RedisClient.singleton) {
      const { host, port, defaultTtl } = config;
      this.client = redis.createClient({ host, port });
      this.defaultTtl = defaultTtl || DEFAULT_TTL_IN_SECONDS;

      // Define singleton.
      RedisClient.singleton = this;
    }

    // Return singleton.
    return RedisClient.singleton;
  }

  /**
   * Get the initialized singleton instance.
   * @returns {RedisClient}
   */
  static getInstance() {
    return RedisClient.singleton;
  }

  /**
   * Create a hash key from provided arguments. Objects will be hashed.
   * @param {any[]} args Arguments.
   * @return {string} Hash key.
   **/
  static createKey(...args) {
    const parts = [RedisClient.prefix, ...args].map(i => typeof i !== 'object' ? String(i) : i);

    return parts
      .map((item) =>
        typeof item === 'object'
          ? crypto.createHash('md5').update(JSON.stringify(item)).digest('hex')
          : item,
      )
      .join('.');
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
      await redis.set(key, data !== undefined ? JSON.stringify(data) : null, ttl);
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
    const [oldTimestamp, newTimestamp] = await Promise.all([
      redis.get(key + '.timestamp').then(JSON.parse),
      timeFn(),
    ]);

    // Invalidate cache if needed.
    if (!oldTimestamp || new Date(newTimestamp) > new Date(oldTimestamp)) {
      redis.delete(key);
    }

    await redis.set(key + '.timestamp', newTimestamp || null);

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
    return new Promise((resolve, reject) => {
      this.client.set(key, data, 'EX', ttl, (err, data) => {
        err && reject(err);
        resolve(data);
      });
    });
  }

  /**
   * Get data from redis.
   * @param {string} key Key for data.
   * @return {Promise<string>}.
   */
  get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, data) => {
        err && reject(err);
        resolve(data);
      });
    });
  }

  /**
   * Delete data from redis.
   * @param {string} key Key for data.
   * @return {Promise<number>} Deleted keys.
   */
  delete(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, data) => {
        err && reject(err);
        resolve(data);
      });
    });
  }

  /**
   * @private
   * @param {string} pattern
   * @return {Promise<string[]>}
   */
  getKeys(pattern) {
    return new Promise((resolve, reject) => {
      this.client.keys(pattern, (err, data) => {
        err && reject(err);
        resolve(data);
      });
    });
  }

  /**
   * @private
   * @param {number} cursor
   * @param {string} pattern
   * @param {number} count
   * @return {Promise<string|Array[]>}
   */
  scan(cursor = 0, pattern, count = 10) {
    return new Promise((resolve, reject) => {
      this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        count,
        (err, data) => {
          err && reject(err);
          resolve(data);
        },
      );
    });
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

    return new Promise((resolve, reject) => {
      this.client.del(keys, (err, data) => {
        err && reject(err);
        resolve(data);
      });
    });
  }
}

module.exports = RedisClient;
