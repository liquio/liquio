import crypto from 'crypto';
import { createClient, RedisClientType } from 'redis';

import { Config } from '../config';
import { BaseService } from './base_service';

export const DEFAULT_TTL_IN_SECONDS = 300; // 5 minutes.
export const DEFAULT_PREFIX = process.env.npm_package_name ?? 'id';

export class RedisService extends BaseService {
  private readonly prefix: string = DEFAULT_PREFIX;
  private readonly client!: RedisClientType;
  private readonly cfg: Config['redis'];
  private readonly defaultTtl: number = DEFAULT_TTL_IN_SECONDS;

  constructor(...args: ConstructorParameters<typeof BaseService>) {
    super(...args);

    this.cfg = this.config.redis;

    if (this.cfg?.isEnabled && this.cfg?.host && this.cfg?.port) {
      this.client = createClient({
        socket: { host: this.cfg.host, port: this.cfg.port },
      });
    }

    if (this.cfg?.prefix) {
      this.prefix = this.cfg.prefix;
    }

    if (this.cfg?.defaultTtl) {
      this.defaultTtl = this.cfg.defaultTtl;
    }
  }

  get isEnabled() {
    return this.cfg?.isEnabled || false;
  }

  async init() {
    if (this.isEnabled) {
      try {
        await this.client.connect();
      } catch (error) {
        throw new Error(`Can not connect to redis: ${error}`);
      }
    }
  }

  async stop() {
    if (this.isEnabled) {
      try {
        await this.client.disconnect();
      } catch (error) {
        throw new Error(`Can not disconnect from redis: ${error}`);
      }
    }
  }

  /**
   * Create a hash key from provided arguments. Objects will be hashed.
   * @param {any[]} args Arguments.
   * @return {string} Hash key.
   **/
  createKey(...args: any[]): string {
    const parts = [this.prefix, ...args].map((i) => (typeof i !== 'object' ? String(i) : i));

    return parts.map((item) => (typeof item === 'object' ? crypto.createHash('md5').update(JSON.stringify(item)).digest('hex') : item)).join('.');
  }

  /**
   * Set-or-get data by key from redis using provided function.
   * @param {string} key Key for data.
   * @param {() => Promise<any>} fn Async function to get data.
   * @param {number} ttl Time to live in seconds (optional).
   **/
  async getOrSet(key: string | any[], fn: () => Promise<any>, ttl?: number): Promise<{ data: any; isFromCache: boolean }> {
    key = Array.isArray(key) ? this.createKey(...key) : key;

    if (this.isEnabled) {
      const data = await this.get(key);
      if (data) {
        return { data: JSON.parse(data), isFromCache: true };
      }
    }

    const data = await fn();

    if (this.isEnabled) {
      await this.set(key, data !== undefined ? JSON.stringify(data) : null, ttl);
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
  async getOrSetWithTimestamp(
    key: string | any[],
    timeFn: () => Promise<number>,
    setFn: () => Promise<any>,
    ttl?: number,
  ): Promise<{ data: any; isFromCache: boolean }> {
    key = Array.isArray(key) ? this.createKey(...key) : key;

    if (!this.isEnabled) {
      return { data: await setFn(), isFromCache: false };
    }

    // Get payload timestamp and new timestamp.
    const [oldTimestamp, newTimestamp] = await Promise.all([
      this.get(key + '.timestamp')
        .then((v) => v?.toString())
        .then((v) => (v !== undefined ? JSON.parse(v) : undefined)),
      timeFn().catch(() => null),
    ]);

    // Invalidate cache if needed.
    if (!oldTimestamp || (newTimestamp && new Date(newTimestamp) > new Date(oldTimestamp))) {
      await this.delete(key);
    }

    await this.set(key + '.timestamp', newTimestamp ?? null);

    return this.getOrSet(key, setFn, ttl);
  }

  /**
   * Increment a value in redis.
   * @param {string} key Key for data.
   * @param {number} increment Increment value.
   * @param {number} ttl Time to live in seconds (optional).
   **/
  async increment(key: string | any[], increment: number, ttl?: number): Promise<number> {
    key = Array.isArray(key) ? this.createKey(...key) : key;

    if (!this.isEnabled) {
      return Promise.resolve(0);
    }

    return this.client
      .multi()
      .incrBy(key, increment)
      .expire(key, ttl ?? this.defaultTtl)
      .exec()
      .then((result) => {
        if (Array.isArray(result)) {
          return result[0] as unknown as number;
        }
        return 0;
      });
  }

  /**
   * Set data to redis.
   */
  async set(key: string | any[], data: any, ttl: number = this.defaultTtl): Promise<string | null> {
    key = Array.isArray(key) ? this.createKey(...key) : key;
    if (typeof data === 'object') data = JSON.stringify(data);
    if (this.client) {
      return this.client.set(key, data, { EX: ttl });
    }
    return null;
  }

  /**
   * Get data from redis.
   */
  async get(key: string | any[]): Promise<string | null> {
    key = Array.isArray(key) ? this.createKey(...key) : key;
    if (this.client) {
      return this.client.get(key);
    }
    return null;
  }

  /**
   * Delete data from redis.
   */
  async delete(key: string | any[]): Promise<number> {
    key = Array.isArray(key) ? this.createKey(...key) : key;
    if (this.client) {
      return this.client.del(key);
    }
    return 0;
  }
}
