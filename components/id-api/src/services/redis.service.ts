import crypto from 'crypto';

import { RedisClient } from '@liquio/back-core';

import { Config } from '../config';
import { BaseService } from './base_service';

export const DEFAULT_TTL_IN_SECONDS = 300; // 5 minutes.
export const DEFAULT_PREFIX = process.env.npm_package_name ?? 'id';

// Compare-and-delete: only the holder of the lock (the one with the matching value) may release it.
const RELEASE_LOCK_SCRIPT = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
// Compare-and-expire: only the holder of the lock may extend it.
const EXTEND_LOCK_SCRIPT = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end";

// The part of the underlying `redis` client that the lock commands need. back-core keeps the client private.
interface RawRedisClient {
  set(key: string, value: string, options: { NX: true; EX: number }): Promise<string | null>;
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
}

/**
 * Redis service: a thin DI adapter (fitting this component's `Services`/`BaseService`
 * registry) over `@liquio/back-core`'s `RedisClient`.
 */
export class RedisService extends BaseService {
  private readonly cfg: Config['redis'];
  private readonly redisClient?: RedisClient;

  constructor(...args: ConstructorParameters<typeof BaseService>) {
    super(...args);

    this.cfg = this.config.redis;

    if (this.cfg?.isEnabled && this.cfg?.host && this.cfg?.port) {
      this.redisClient = new RedisClient({
        host: this.cfg.host,
        port: this.cfg.port,
        defaultTtl: this.cfg.defaultTtl ?? DEFAULT_TTL_IN_SECONDS,
        prefix: this.cfg.prefix ?? DEFAULT_PREFIX,
        getLog: () => this.log,
      });
    }
  }

  get isEnabled() {
    return !!this.redisClient?.isEnabled;
  }

  async init() {
    if (this.isEnabled) {
      await this.redisClient!.connect();
    }
  }

  async stop() {
    if (this.isEnabled) {
      await this.redisClient!.close();
    }
  }

  /**
   * Create a hash key from provided arguments. Objects will be hashed.
   * @param {any[]} args Arguments.
   * @return {string} Hash key.
   **/
  createKey(...args: any[]): string {
    return this.redisClient ? this.redisClient.createKey(...args) : args.join('.');
  }

  /**
   * Set-or-get data by key from redis using provided function.
   * @param {string} key Key for data.
   * @param {() => Promise<any>} fn Async function to get data.
   * @param {number} ttl Time to live in seconds (optional).
   **/
  async getOrSet(key: string | any[], fn: () => Promise<any>, ttl?: number): Promise<{ data: any; isFromCache: boolean }> {
    if (!this.redisClient) {
      return { data: await fn(), isFromCache: false };
    }
    return this.redisClient.getOrSet(key, fn, ttl);
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
    if (!this.redisClient) {
      return { data: await setFn(), isFromCache: false };
    }
    return this.redisClient.getOrSetWithTimestamp(key, timeFn as unknown as () => Promise<string>, setFn, ttl);
  }

  /**
   * Increment a value in redis.
   * @param {string} key Key for data.
   * @param {number} increment Increment value.
   * @param {number} ttl Time to live in seconds (optional).
   **/
  async increment(key: string | any[], increment: number, ttl?: number): Promise<number> {
    if (!this.redisClient) {
      return 0;
    }
    return this.redisClient.increment(key, increment, ttl);
  }

  /**
   * Set data to redis.
   */
  async set(key: string | any[], data: any, ttl?: number): Promise<string | null> {
    if (!this.redisClient) {
      return null;
    }
    return this.redisClient.set(key, data, ttl);
  }

  /**
   * Get data from redis.
   */
  async get(key: string | any[]): Promise<string | null> {
    if (!this.redisClient) {
      return null;
    }
    return this.redisClient.get(key);
  }

  /**
   * Delete data from redis.
   */
  async delete(key: string | any[]): Promise<number> {
    if (!this.redisClient) {
      return 0;
    }
    return this.redisClient.delete(key);
  }

  /**
   * Try to take a lock (SET NX with a TTL).
   * @param {string} name Lock name.
   * @param {number} ttl Time to live in seconds.
   * @return {Promise<string | null>} Lock token to release or extend the lock with, or null if the lock is held by someone else or redis is disabled.
   **/
  async acquireLock(name: string, ttl: number): Promise<string | null> {
    const raw = this.rawClient();
    if (!raw) {
      return null;
    }
    const token = crypto.randomUUID();
    const result = await raw.set(this.createKey('lock', name), token, { NX: true, EX: ttl });
    return result === 'OK' ? token : null;
  }

  /**
   * Extend a lock that is still held with this token.
   * @return {Promise<boolean>} False if the lock has expired or belongs to someone else.
   **/
  async extendLock(name: string, token: string, ttl: number): Promise<boolean> {
    const raw = this.rawClient();
    if (!raw) {
      return false;
    }
    const result = await raw.eval(EXTEND_LOCK_SCRIPT, { keys: [this.createKey('lock', name)], arguments: [token, String(ttl)] });
    return Number(result) === 1;
  }

  /**
   * Release a lock, only if it is still held with this token.
   * @return {Promise<boolean>} False if the lock has expired or belongs to someone else.
   **/
  async releaseLock(name: string, token: string): Promise<boolean> {
    const raw = this.rawClient();
    if (!raw) {
      return false;
    }
    const result = await raw.eval(RELEASE_LOCK_SCRIPT, { keys: [this.createKey('lock', name)], arguments: [token] });
    return Number(result) === 1;
  }

  private rawClient(): RawRedisClient | undefined {
    if (!this.isEnabled) {
      return undefined;
    }
    return (this.redisClient as unknown as { client?: RawRedisClient }).client;
  }
}
