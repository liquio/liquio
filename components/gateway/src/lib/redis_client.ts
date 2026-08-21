import { createClient, RedisClientType } from 'redis';

/**
 * Redis client.
 */
export class RedisClient {
  static singleton: RedisClient;
  client: RedisClientType;
  defaultTtl: number | undefined;

  /**
   * Redis client constructor.
   */
  constructor(config: any) {
    // Singleton.
    if (!RedisClient.singleton) {
      const { host, port, defaultTtl } = config;
      // v5: use socket object
      this.client = createClient({
        socket: { host, port },
      }) as RedisClientType;
      this.defaultTtl = defaultTtl;

      // Connect to redis in background (don't wait for it)
      this.client.connect().catch(err => {
        console.error('Redis connection error:', err);
      });

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
  async set(key: string, data: any, ttl: number | undefined = this.defaultTtl): Promise<string | null> {
    if (typeof data === 'object') {
      data = JSON.stringify(data);
    }
    // v5: Promise API with options object
    return this.client.set(key, data, { EX: ttl }) as any;
  }

  /**
   * Get data from redis.
   * @param {string} key Key for data.
   * @return {Promise<string>}.
   */
  async get(key: string) {
    // v5: Direct Promise return
    return this.client.get(key);
  }

  /**
   * Delete data from redis.
   * @param {string} key Key for data.
   * @return {Promise<number>} Deleted keys.
   */
  async delete(key: string) {
    // v5: use del() instead of delete()
    return this.client.del(key);
  }
}
