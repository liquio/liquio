const redis = require('redis');

/**
 * Redis client.
 */
class RedisClient {
  /**
   * Redis client constructor.
   */
  constructor(config) {
    // Singleton.
    if (!RedisClient.singleton) {
      const { host, port, defaultTtl } = config;
      this.client = redis.createClient({ host, port });
      this.defaultTtl = defaultTtl;

      // Define singleton.
      RedisClient.singleton = this;
    }

    // Return singleton.
    return RedisClient.singleton;
  }

  /**
   * Set data to redis.
   * @param {string} key Key for data.
   * @param {object|string} data Data to set.
   * @param {number} ttl Time to live.
   * @return {Promise<string>} OK.
   */
  set(key, data, ttl = this.defaultTtl) {
    if (typeof data === 'object') {
      data = JSON.stringify(data);
    }
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
}

module.exports = RedisClient;
