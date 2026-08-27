import crypto from 'node:crypto';
import { createClient } from 'redis';

const DEFAULT_TTL_IN_SECONDS = 300; // 5 minutes.

/**
 * Redis client.
 */
export class RedisClient {
  static singleton: RedisClient;
  static prefix: string | undefined = process.env.npm_package_name;

  client: ReturnType<typeof createClient>;
  defaultTtl: number;

  /**
   * Redis client constructor.
   * @param {object} config Config object.
   */
  constructor() {
    // Singleton.
    if (!RedisClient.singleton) {
      const { host, port, ttl } = global.config.redis;
      this.client = createClient({ socket: { host, port } });
      this.defaultTtl = ttl || DEFAULT_TTL_IN_SECONDS;

      this.client.connect().catch((err: any) => {
        console.error('Redis connection error:', err);
      });

      // Define singleton.
      RedisClient.singleton = this;
    }

    // Return singleton.
    return RedisClient.singleton;
  }

  /**
   * Create a hash key from provided arguments. Objects will be hashed.
   * @param {any[]} args Arguments.
   * @return {string} Hash key.
   **/
  static createKey(...args: any[]): string {
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
  static async getOrSet(key: string, fn: () => Promise<any>, ttl: number | undefined = undefined): Promise<{ data: any; isFromCache: boolean }> {
    const redis = RedisClient.singleton;

    if (redis) {
      const data = await redis.get(key);
      if (data) {
        return { data: JSON.parse(data), isFromCache: true };
      }
    }

    const data = await fn();

    if (redis) {
      await redis.set(key, data !== undefined ? JSON.stringify(data) : null, ttl as any);
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
  static async getOrSetWithTimestamp(
    key: string,
    timeFn: () => Promise<any>,
    setFn: () => Promise<any>,
    ttl: number | undefined = undefined,
  ): Promise<{ data: any; isFromCache: boolean }> {
    const redis = RedisClient.singleton;

    if (!redis) {
      return { data: await setFn(), isFromCache: false };
    }

    // Get payload timestamp and new timestamp.
    const [oldTimestamp, newTimestamp] = await Promise.all([redis.get(key + '.timestamp').then((v: any) => JSON.parse(v)), timeFn()]);

    // Invalidate cache if needed.
    if (!oldTimestamp || new Date(newTimestamp) > new Date(oldTimestamp)) {
      (redis as any).delete(key);
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
  async set(key: string, data: any, ttl: number = this.defaultTtl): Promise<any> {
    if (typeof data === 'object') data = JSON.stringify(data);
    return this.client.set(key, data, { EX: ttl });
  }

  /**
   * Get data from redis.
   * @param {string} key Key for data.
   * @return {Promise<string>}.
   */
  async get(key: string): Promise<any> {
    return this.client.get(key);
  }

  /**
   * Delete data from redis.
   * @param {string} key Key for data.
   * @return {Promise<number>} Deleted keys.
   */
  async delete(key: string): Promise<any> {
    return this.client.del(key);
  }

  /**
   * @private
   * @param {string} pattern
   * @return {Promise<string[]>}
   */
  async getKeys(pattern: string): Promise<any> {
    return this.client.keys(pattern);
  }

  /**
   * @private
   * @param {number} cursor
   * @param {string} pattern
   * @param {number} count
   * @return {Promise<string|Array[]>}
   */
  async scan(cursor: number = 0, pattern?: string, count: number = 10): Promise<any> {
    return this.client.scan(cursor as any, { MATCH: pattern, COUNT: count });
  }

  /**
   * @param {string} pattern
   * @return {Promise<number>}
   */
  async deleteMany(pattern: string): Promise<any> {
    const keys = await this.getKeys(pattern);

    if (!keys.length) {
      return 0;
    }

    return this.client.del(keys);
  }

  /**
   * Get object from redis.
   * @param {string} key Key for data.
   * @returns {Promise<object>} Parsed data.
   */
  async getObject(key: string): Promise<any> {
    // Get data string.
    const data = await this.get(key);

    // Parse data to object.
    let parsedObject;
    try {
      parsedObject = JSON.parse(data as string);
    } catch (error: any) {
      global.log.save('redis-parse-object-error', { key, data, error: error.message });
      throw error;
    }

    // Return parsed object.
    return parsedObject;
  }
}
