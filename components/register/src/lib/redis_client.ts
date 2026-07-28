import crypto from 'crypto';
import { RedisClientType, createClient } from 'redis';

const DEFAULT_TTL_IN_SECONDS = 300; // 5 minutes.

export interface RedisConfig {
  host: string;
  port: number;
  defaultTtl?: number;
}

/**
 * Redis client.
 */
export class RedisClient {
  private static singleton: RedisClient;
  private client: RedisClientType;
  private defaultTtl: number;
  static prefix = process.env.npm_package_name || 'bpmn-register';

  /**
   * Redis client constructor.
   * @param {RedisConfig} config Config object.
   */
  constructor(config: RedisConfig) {
    // Singleton.
    if (!RedisClient.singleton) {
      const { host, port, defaultTtl } = config;
      this.client = createClient({
        socket: { host, port }
      });
      this.defaultTtl = defaultTtl || DEFAULT_TTL_IN_SECONDS;

      // Define singleton.
      RedisClient.singleton = this;
    }

    // Return singleton.
    return RedisClient.singleton;
  }

  /**
   * Connect to redis.
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      throw new Error(`Can not connect to redis: ${error}`);
    }
  }

  /**
   * Get the initialized singleton instance.
   */
  static getInstance(): RedisClient {
    return RedisClient.singleton;
  }

  /**
   * Create a hash key from provided arguments. Objects will be hashed.
   * @param {any[]} args Arguments.
   * @return {string} Hash key.
   **/
  static createKey(...args: any[]): string {
    const parts = [RedisClient.prefix, ...args].map((i) => (typeof i !== 'object' ? String(i) : i));

    return parts.map((item) => (typeof item === 'object' ? crypto.createHash('md5').update(JSON.stringify(item)).digest('hex') : item)).join('.');
  }

  /**
   * Set-or-get data by key from redis using provided function.
   * @param {string} key Key for data.
   * @param {() => Promise<any>} fn Async function to get data.
   * @param {number} ttl Time to live in seconds (optional).
   * @return {Promise<{ data: any, isFromCache: boolean }>} Data.
   **/
  static async getOrSet(key: string | any[], fn: () => Promise<any>, ttl?: number): Promise<{ data: any; isFromCache: boolean }> {
    key = Array.isArray(key) ? RedisClient.createKey(...key) : key;

    const redis = RedisClient.singleton;

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
   * @param {() => Promise<string>} timeFn Async function to get timestamp.
   * @param {() => Promise<any>} setFn Async function to set data.
   * @param {number} ttl Time to live in seconds (optional).
   * @return {Promise<{ data: any, isFromCache: boolean }>} Data.
   **/
  static async getOrSetWithTimestamp(
    key: string | any[],
    timeFn: () => Promise<string>,
    setFn: () => Promise<any>,
    ttl?: number
  ): Promise<{ data: any; isFromCache: boolean }> {
    key = Array.isArray(key) ? RedisClient.createKey(...key) : key;

    const redis = RedisClient.singleton;

    if (!redis) {
      return { data: await setFn(), isFromCache: false };
    }

    // Get payload timestamp and new timestamp.
    const [oldTimestamp, newTimestamp] = await Promise.all([redis.get(key + '.timestamp').then(JSON.parse), timeFn()]);

    // Invalidate cache if needed.
    if (!oldTimestamp || new Date(newTimestamp) > new Date(oldTimestamp)) {
      await redis.delete(key);
    }

    await redis.set(key + '.timestamp', newTimestamp || null);

    return RedisClient.getOrSet(key, setFn, ttl);
  }

  /**
   * Set data to redis.
   * @param {string} key Key for data.
   * @param {any} data Data to set.
   * @param {number} ttl Time to live.
   * @return {Promise<string>} OK.
   */
  async set(key: string | any[], data: any, ttl: number = this.defaultTtl): Promise<string> {
    key = Array.isArray(key) ? RedisClient.createKey(...key) : key;
    if (typeof data === 'object') data = JSON.stringify(data);
    return (await this.client.set(key, data, { EX: ttl })) as string;
  }

  /**
   * Get data from redis.
   * @param {string} key Key for data.
   * @return {Promise<string | null>}.
   */
  async get(key: string | any[]): Promise<string | null> {
    key = Array.isArray(key) ? RedisClient.createKey(...key) : key;
    return (await this.client.get(key)) as unknown as string | null;
  }

  /**
   * Delete data from redis.
   * @param {string} key Key for data.
   * @return {Promise<number>} Deleted keys.
   */
  async delete(key: string | any[]): Promise<number> {
    key = Array.isArray(key) ? RedisClient.createKey(...key) : key;
    return (await this.client.del(key)) as unknown as number;
  }

  /**
   * @private
   * @param {string} pattern
   * @return {Promise<string[]>}
   */
  private async getKeys(pattern: string | any[]): Promise<string[]> {
    pattern = Array.isArray(pattern) ? RedisClient.createKey(...pattern) : pattern;
    return this.client.keys(pattern);
  }

  /**
   * @param {string} pattern
   * @return {Promise<number>}
   */
  async deleteMany(pattern: string | any[]): Promise<number> {
    pattern = Array.isArray(pattern) ? RedisClient.createKey(...pattern) : pattern;

    const keys = await this.getKeys(pattern);

    if (!keys.length) {
      return 0;
    }

    return (await this.client.del(keys)) as unknown as number;
  }

  /**
   * Close the Redis connection.
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      RedisClient.singleton = undefined as any;
    }
  }
}
