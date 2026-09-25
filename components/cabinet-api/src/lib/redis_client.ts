import { RedisClient as BackCoreRedisClient, RedisClientConfig } from '@liquio/back-core';

export type RedisConfig = Omit<RedisClientConfig, 'getLog' | 'prefix'>;

interface CacheResult<T> {
  data: T;
  isFromCache: boolean;
}

/**
 * Cabinet-api's redis client: a thin, singleton-per-process binding of `@liquio/back-core`'s
 * `RedisClient`, preserving this component's static call-site API (`RedisClient.getOrSet(...)`,
 * `RedisClient.createKey(...)`) used throughout its models.
 */
class RedisClient extends BackCoreRedisClient {
  private static singleton: RedisClient;
  private static prefix: string;

  /**
   * @param {RedisConfig} config Redis config with host, port, optional defaultTtl.
   */
  constructor(config: RedisConfig) {
    if (RedisClient.singleton) {
      return RedisClient.singleton;
    }

    const prefix = process.env.npm_package_name || 'cabinet-api';
    super({ ...config, prefix, getLog: () => global.log });

    RedisClient.singleton = this;
    RedisClient.prefix = prefix;
  }

  /**
   * Create a hash key from provided arguments (objects will be hashed).
   * @param {any[]} args Arguments.
   * @returns {string} Hash key.
   */
  static createKey(...args: any[]): string {
    return RedisClient.singleton?.createKey(...args);
  }

  /**
   * Get or set data in cache.
   * @template T
   * @param {string|any[]} key Cache key.
   * @param {() => Promise<T>} fn Function to fetch data if not cached.
   * @param {number} [ttl] Time to live in seconds.
   * @returns {Promise<CacheResult<T>>} Data and cache status.
   */
  static async getOrSet<T>(key: string | any[], fn: () => Promise<T>, ttl?: number): Promise<CacheResult<T>> {
    if (!RedisClient.singleton) {
      return { data: await fn(), isFromCache: false };
    }
    return RedisClient.singleton.getOrSet(key, fn, ttl);
  }

  /**
   * Get or set data with timestamp validation.
   * @template T
   * @param {string|any[]} key Cache key.
   * @param {() => Promise<string|number>} timeFn Function to get the current timestamp.
   * @param {() => Promise<T>} setFn Function to fetch data if needed.
   * @param {number} [ttl] Time to live in seconds.
   * @returns {Promise<CacheResult<T>>} Data and cache status.
   */
  static async getOrSetWithTimestamp<T>(
    key: string | any[],
    timeFn: () => Promise<string | number>,
    setFn: () => Promise<T>,
    ttl?: number,
  ): Promise<CacheResult<T>> {
    if (!RedisClient.singleton) {
      return { data: await setFn(), isFromCache: false };
    }
    return RedisClient.singleton.getOrSetWithTimestamp(key, timeFn as () => Promise<string>, setFn, ttl);
  }
}

export default RedisClient;
