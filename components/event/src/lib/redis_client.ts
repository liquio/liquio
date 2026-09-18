import { RedisClient as BackCoreRedisClient } from '@liquio/back-core';

/**
 * Event's redis client: a thin, singleton-per-process binding of `@liquio/back-core`'s
 * `RedisClient`, reading its config from `global.config.redis` (matching this component's
 * existing zero-arg `new RedisClient()` call site) and preserving the static call-site API
 * (`RedisClient.getOrSet(...)`, `RedisClient.createKey(...)`) used throughout its models.
 */
export class RedisClient extends BackCoreRedisClient {
  static singleton: RedisClient;
  static prefix: string | undefined = process.env.npm_package_name;

  constructor() {
    if (RedisClient.singleton) {
      return RedisClient.singleton;
    }

    const { host, port, ttl, enabled } = global.config.redis || {};
    super({ host, port, defaultTtl: ttl, isEnabled: enabled, prefix: RedisClient.prefix, getLog: () => global.log });

    RedisClient.singleton = this;
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
