import crypto from 'node:crypto';
import { createClient, RedisClientType } from 'redis';

/** Default TTL applied to `set`/`increment` calls that don't pass an explicit one. */
const DEFAULT_TTL_IN_SECONDS = 300; // 5 minutes.

/**
 * Minimal structural shape for the log object each component exposes on `global.log`.
 */
export interface RedisClientLog {
  save(event: string, data: Record<string, unknown>, level?: 'info' | 'warn' | 'error'): void;
}

export interface RedisClientConfig {
  host: string;
  port: number;
  /** Default: `true`. When `false` (or host/port missing), the client never connects and every method becomes a safe no-op. */
  isEnabled?: boolean;
  /** Default TTL in seconds applied when `set`/`increment` don't get an explicit one. Default: 300. */
  defaultTtl?: number;
  /** Prepended (dot-joined) to keys built via `createKey`. */
  prefix?: string;
  /** Returns the logger used for connection/parse errors. */
  getLog: () => RedisClientLog;
}

/**
 * Redis client wrapping the `redis` v5/v6 package with the caching helpers (`getOrSet`,
 * `getOrSetWithTimestamp`, key hashing, TTL defaulting) every component used to reimplement.
 *
 * Consolidates the near-identical `RedisClient` implementations previously duplicated across
 * the admin-api, id-api, register, cabinet-api, event, task, manager and gateway components.
 * Instance-based rather than a forced singleton (like `Sandbox`): a component may need several
 * independent clients at once (e.g. a main cache plus a separate custom-logs cache), each with
 * its own connection.
 */
export class RedisClient {
  private config: RedisClientConfig;
  private client?: RedisClientType;
  private connectPromise?: Promise<void>;
  private defaultTtl: number;
  private prefix: string;

  /**
   * @param {RedisClientConfig} config Redis client configuration.
   */
  constructor(config: RedisClientConfig) {
    this.config = config;
    this.defaultTtl = config.defaultTtl || DEFAULT_TTL_IN_SECONDS;
    this.prefix = config.prefix || '';

    if (this.isEnabled) {
      this.client = createClient({ socket: { host: config.host, port: config.port } }) as RedisClientType;
      this.client.on('error', (error) => this.getLog().save('redis-error', { error: errorMessage(error) }, 'error'));
      this.client.on('ready', () => this.getLog().save('redis-connected', { host: config.host, port: config.port }, 'info'));
      this.connectPromise = this.client.connect().then(() => undefined);
      // Always log a connection failure at least once, even if nobody calls `connect()` to
      // observe it (most components fire-and-forget the initial connection).
      this.connectPromise.catch((error) => {
        this.getLog().save('redis-connection-error', { error: errorMessage(error) }, 'error');
      });
    }
  }

  /**
   * Whether this client is enabled and has a backing connection. When `false`, every other
   * method is a safe no-op.
   * @returns {boolean}
   */
  get isEnabled(): boolean {
    return this.config.isEnabled !== false && !!this.config.host && !!this.config.port;
  }

  private getLog(): RedisClientLog {
    return this.config.getLog();
  }

  /**
   * Connect to redis. Idempotent: awaits the same connection promise the constructor already
   * kicked off, rather than issuing a second `connect()` call. Rejects (wrapped) on failure,
   * so a caller that awaits this explicitly can fail fast at startup.
   * @returns {Promise<void>}
   */
  async connect(): Promise<void> {
    if (!this.connectPromise) {
      return;
    }
    try {
      await this.connectPromise;
    } catch (error) {
      throw new Error(`Can not connect to redis: ${error}`);
    }
  }

  /**
   * Close the redis connection.
   * @returns {Promise<void>}
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Create a hash key from provided arguments. Objects are hashed.
   * @param {any[]} args Arguments.
   * @returns {string} Hash key.
   */
  createKey(...args: any[]): string {
    const parts = [this.prefix, ...args].filter((part) => part !== '');
    return parts
      .map((item) => (typeof item === 'object' && item !== null ? crypto.createHash('md5').update(JSON.stringify(item)).digest('hex') : String(item)))
      .join('.');
  }

  private resolveKey(key: string | any[]): string {
    return Array.isArray(key) ? this.createKey(...key) : key;
  }

  /**
   * Set data to redis.
   * @param {string|any[]} key Key for data.
   * @param {any} data Data to set.
   * @param {number} [ttl] Time to live in seconds.
   * @returns {Promise<string|null>} OK, or `null` when disabled.
   */
  async set(key: string | any[], data: any, ttl: number = this.defaultTtl): Promise<string | null> {
    if (!this.isEnabled) {
      return null;
    }
    const resolvedKey = this.resolveKey(key);
    const value = typeof data === 'object' ? JSON.stringify(data) : data;
    return (await this.client!.set(resolvedKey, value, { EX: ttl })) as string | null;
  }

  /**
   * Get data from redis.
   * @param {string|any[]} key Key for data.
   * @returns {Promise<string|null>}
   */
  async get(key: string | any[]): Promise<string | null> {
    if (!this.isEnabled) {
      return null;
    }
    return (await this.client!.get(this.resolveKey(key))) as string | null;
  }

  /**
   * Get data from redis and parse it as JSON.
   * @param {string|any[]} key Key for data.
   * @returns {Promise<any>} Parsed data, or `null` when disabled/missing.
   */
  async getObject(key: string | any[]): Promise<any> {
    const data = await this.get(key);
    if (data === null) {
      return null;
    }
    try {
      return JSON.parse(data);
    } catch (error: any) {
      this.getLog().save('redis-parse-object-error', { key, data, error: error?.message }, 'error');
      throw error;
    }
  }

  /**
   * Delete data from redis.
   * @param {string|any[]} key Key for data.
   * @returns {Promise<number>} Number of deleted keys.
   */
  async delete(key: string | any[]): Promise<number> {
    if (!this.isEnabled) {
      return 0;
    }
    return this.client!.del(this.resolveKey(key));
  }

  /**
   * Find keys matching a pattern.
   * @param {string|any[]} pattern Key pattern.
   * @returns {Promise<string[]>}
   */
  async getKeys(pattern: string | any[]): Promise<string[]> {
    if (!this.isEnabled) {
      return [];
    }
    return this.client!.keys(this.resolveKey(pattern));
  }

  /**
   * Incrementally scan the keyspace for keys matching a pattern.
   * @param {number} cursor Cursor to resume from (0 to start).
   * @param {string} [pattern] Key pattern.
   * @param {number} [count] Hint for how many keys to scan per iteration.
   * @returns {Promise<{cursor: number, keys: string[]}>}
   */
  async scan(cursor: number = 0, pattern?: string, count: number = 10): Promise<{ cursor: number; keys: string[] }> {
    if (!this.isEnabled) {
      return { cursor: 0, keys: [] };
    }
    const result = await this.client!.scan(cursor as unknown as never, { MATCH: pattern, COUNT: count });
    return { cursor: Number(result.cursor), keys: result.keys };
  }

  /**
   * Delete all keys matching a pattern.
   * @param {string|any[]} pattern Key pattern.
   * @returns {Promise<number>} Number of deleted keys.
   */
  async deleteMany(pattern: string | any[]): Promise<number> {
    if (!this.isEnabled) {
      return 0;
    }
    const keys = await this.getKeys(pattern);
    if (!keys.length) {
      return 0;
    }
    return this.client!.del(keys);
  }

  /**
   * Atomically increment a value and (re)set its TTL.
   * @param {string|any[]} key Key for data.
   * @param {number} increment Increment value.
   * @param {number} [ttl] Time to live in seconds.
   * @returns {Promise<number>} New value, or `0` when disabled.
   */
  async increment(key: string | any[], increment: number, ttl: number = this.defaultTtl): Promise<number> {
    if (!this.isEnabled) {
      return 0;
    }
    const resolvedKey = this.resolveKey(key);
    const result = await this.client!.multi().incrBy(resolvedKey, increment).expire(resolvedKey, ttl).exec();
    return Array.isArray(result) ? (result[0] as unknown as number) : 0;
  }

  /**
   * Get-or-set data by key, calling `fn` on a cache miss.
   * @param {string|any[]} key Key for data.
   * @param {() => Promise<any>} fn Async function to get data on a cache miss.
   * @param {number} [ttl] Time to live in seconds.
   * @returns {Promise<{data: any, isFromCache: boolean}>} Data.
   */
  async getOrSet(key: string | any[], fn: () => Promise<any>, ttl?: number): Promise<{ data: any; isFromCache: boolean }> {
    const resolvedKey = this.resolveKey(key);

    if (this.isEnabled) {
      const data = await this.get(resolvedKey);
      if (data) {
        return { data: JSON.parse(data), isFromCache: true };
      }
    }

    const data = await fn();

    if (this.isEnabled) {
      await this.set(resolvedKey, data !== undefined ? JSON.stringify(data) : null, ttl ?? this.defaultTtl);
    }

    return { data, isFromCache: false };
  }

  /**
   * Get-or-set data by key, invalidating the cache whenever `timeFn` reports a timestamp
   * newer than the one the cached entry was stored with.
   * @param {string|any[]} key Key for data.
   * @param {() => Promise<string>} timeFn Async function returning the current data timestamp.
   * @param {() => Promise<any>} setFn Async function to get data on a cache miss.
   * @param {number} [ttl] Time to live in seconds.
   * @returns {Promise<{data: any, isFromCache: boolean}>} Data.
   */
  async getOrSetWithTimestamp(
    key: string | any[],
    timeFn: () => Promise<string>,
    setFn: () => Promise<any>,
    ttl?: number,
  ): Promise<{ data: any; isFromCache: boolean }> {
    const resolvedKey = this.resolveKey(key);

    if (!this.isEnabled) {
      return { data: await setFn(), isFromCache: false };
    }

    // Get payload timestamp and new timestamp.
    const [oldTimestampRaw, newTimestamp] = await Promise.all([this.get(resolvedKey + '.timestamp'), timeFn()]);
    const oldTimestamp = oldTimestampRaw ? JSON.parse(oldTimestampRaw) : undefined;

    // Invalidate cache if needed.
    if (!oldTimestamp || (newTimestamp && new Date(newTimestamp) > new Date(oldTimestamp))) {
      await this.delete(resolvedKey);
    }

    await this.set(resolvedKey + '.timestamp', newTimestamp || null);

    return this.getOrSet(resolvedKey, setFn, ttl);
  }
}

/**
 * Best-effort human-readable message for a thrown value.
 * @param {unknown} error Thrown value.
 * @returns {string}
 */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
