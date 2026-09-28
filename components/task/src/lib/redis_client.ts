import { RedisClient as BackCoreRedisClient, RedisClientConfig } from '@liquio/back-core';

export type RedisConfig = Omit<RedisClientConfig, 'getLog' | 'prefix'>;

/**
 * Task's redis client: a thin, singleton-per-process binding of `@liquio/back-core`'s
 * `RedisClient`, preserving this component's static call-site API (`RedisClient.getOrSet(...)`,
 * `RedisClient.createKey(...)`) used throughout its models/businesses.
 */
export class RedisClient extends BackCoreRedisClient {
  private static singleton: RedisClient;
  static prefix = process.env.npm_package_name || 'bpmn-task';

  /**
   * @param {RedisConfig} config Config object.
   */
  constructor(config: RedisConfig) {
    if (RedisClient.singleton) {
      return RedisClient.singleton;
    }

    super({ ...config, prefix: RedisClient.prefix, getLog: () => global.log });
    RedisClient.singleton = this;
  }

  /**
   * Get the initialized singleton instance.
   * @returns {RedisClient}
   */
  static getInstance(): RedisClient {
    return RedisClient.singleton;
  }

  /**
   * Create a hash key from provided arguments. Objects will be hashed.
   * @param {any[]} args Arguments.
   * @returns {string} Hash key.
   */
  static createKey(...args: any[]): string {
    return RedisClient.singleton?.createKey(...args);
  }

  /**
   * Set-or-get data by key from redis using provided function.
   * @param {string|any[]} key Key for data.
   * @param {() => Promise<any>} fn Async function to get data.
   * @param {number} [ttl] Time to live in seconds.
   * @returns {Promise<{data: any, isFromCache: boolean}>} Data.
   */
  static async getOrSet(key: string | any[], fn: () => Promise<any>, ttl?: number): Promise<{ data: any; isFromCache: boolean }> {
    if (!RedisClient.singleton) {
      return { data: await fn(), isFromCache: false };
    }
    return RedisClient.singleton.getOrSet(key, fn, ttl);
  }

  /**
   * Set-or-get data by key from redis using provided function and timestamp.
   * @param {string|any[]} key Key for data.
   * @param {() => Promise<any>} timeFn Async function to get timestamp.
   * @param {() => Promise<any>} setFn Async function to set data.
   * @param {number} [ttl] Time to live in seconds.
   * @returns {Promise<{data: any, isFromCache: boolean}>} Data.
   */
  static async getOrSetWithTimestamp(
    key: string | any[],
    timeFn: () => Promise<any>,
    setFn: () => Promise<any>,
    ttl?: number,
  ): Promise<{ data: any; isFromCache: boolean }> {
    if (!RedisClient.singleton) {
      return { data: await setFn(), isFromCache: false };
    }
    return RedisClient.singleton.getOrSetWithTimestamp(key, timeFn, setFn, ttl);
  }
}
