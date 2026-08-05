import * as crypto from 'crypto';
import { createClient, RedisClientType } from 'redis';

const DEFAULT_TTL_IN_SECONDS = 300; // 5 minutes

interface RedisConfig {
  host: string;
  port: number;
  defaultTtl?: number;
}

interface CacheResult<T> {
  data: T;
  isFromCache: boolean;
}

/**
 * Redis client manager (singleton) with generic caching methods
 */
class RedisClient {
  private static singleton: RedisClient;
  private static prefix: string;
  private client: RedisClientType;
  private defaultTtl: number;

  // Test helpers - expose static members for testing
  static get _singleton(): RedisClient | undefined {
    return RedisClient.singleton;
  }

  static set _singleton(value: RedisClient | undefined) {
    RedisClient.singleton = value as any;
  }

  static get _prefix(): string {
    return RedisClient.prefix;
  }

  static set _prefix(value: string) {
    RedisClient.prefix = value;
  }

  // Instance test helpers
  get _defaultTtl(): number {
    return this.defaultTtl;
  }

  /**
   * Redis client constructor
   * @param config - Redis config with host, port, optional defaultTtl
   */
  constructor(config: RedisConfig) {
    if (!RedisClient.singleton) {
      const { host, port, defaultTtl } = config;
      this.client = createClient({ socket: { host, port } }) as RedisClientType;
      this.defaultTtl = defaultTtl || DEFAULT_TTL_IN_SECONDS;

      this.client.on('ready', () => {
        log.save('redis-connected');
      });

      this.client.on('error', (error) => {
        log.save('redis-error', error, 'error');
      });

      this.client.connect();

      RedisClient.singleton = this;
      RedisClient.prefix = process.env.npm_package_name || 'cabinet-api';
    }

    return RedisClient.singleton;
  }

  /**
   * Create a hash key from provided arguments
   * @param args - Arguments to create key from (objects will be hashed)
   * @returns Hash key string
   */
  static createKey(...args: any[]): string {
    const parts = [RedisClient.prefix, ...args];

    return parts.map((item) => (typeof item === 'object' ? crypto.createHash('md5').update(JSON.stringify(item)).digest('hex') : item)).join('.');
  }

  /**
   * Get or set data in cache
   * @param key - Cache key
   * @param fn - Function to fetch data if not cached
   * @param ttl - Time to live in seconds (optional)
   * @returns Promise with data and cache status
   */
  static async getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<CacheResult<T>> {
    const redis = RedisClient.singleton;

    if (redis) {
      const data = await redis.get(key);
      if (data) {
        return { data: JSON.parse(data) as T, isFromCache: true };
      }
    }

    const data = await fn();

    if (redis) {
      await redis.set(key, JSON.stringify(data), ttl);
    }

    return { data, isFromCache: false };
  }

  /**
   * Get or set data with timestamp validation
   * @param key - Cache key
   * @param timeFn - Function to get current timestamp
   * @param setFn - Function to fetch data if needed
   * @param ttl - Time to live in seconds (optional)
   * @returns Promise with data and cache status
   */
  static async getOrSetWithTimestamp<T>(
    key: string,
    timeFn: () => Promise<string | number>,
    setFn: () => Promise<T>,
    ttl?: number,
  ): Promise<CacheResult<T>> {
    const redis = RedisClient.singleton;

    if (!redis) {
      return { data: await setFn(), isFromCache: false };
    }

    const oldTimestampStr = await redis.get(key + '.timestamp');
    const oldTimestamp = oldTimestampStr ? JSON.parse(oldTimestampStr) : null;
    const newTimestamp = await timeFn();

    if (!oldTimestamp || new Date(newTimestamp) > new Date(oldTimestamp)) {
      await redis.delete(key);
    }

    await redis.set(key + '.timestamp', JSON.stringify(newTimestamp), ttl);

    return RedisClient.getOrSet(key, setFn, ttl);
  }

  /**
   * Set data in cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in seconds
   * @returns Promise with status
   */
  set(key: string, data: Record<string, any> | string, ttl: number = this.defaultTtl): Promise<string | null> {
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : data;
    return this.client.set(key, dataStr, { EX: ttl }) as Promise<string | null>;
  }

  /**
   * Get data from cache
   * @param key - Cache key
   * @returns Promise with cached data or null
   */
  async get(key: string): Promise<string | null> {
    const result = (await this.client.get(key)) as string | null;
    return result || null;
  }

  /**
   * Delete data from cache
   * @param key - Cache key
   * @returns Promise with number of deleted keys
   */
  async delete(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * Get keys matching pattern
   * @param pattern - Key pattern
   * @returns Promise with matching keys
   */
  private async getKeys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  /**
   * Get keys matching pattern (test helper)
   * @param pattern - Key pattern
   * @returns Promise with matching keys
   */
  async _getKeys(pattern: string): Promise<string[]> {
    return this.getKeys(pattern);
  }

  /**
   * Delete multiple keys matching pattern
   * @param pattern - Key pattern
   * @returns Promise with number of deleted keys
   */
  async deleteMany(pattern: string): Promise<number> {
    const keys = await this.getKeys(pattern);

    if (!keys.length) {
      return 0;
    }

    return this.client.del(keys);
  }
}

export default RedisClient;
