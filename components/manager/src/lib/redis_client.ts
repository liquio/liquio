import { RedisClient as BackCoreRedisClient, RedisClientConfig } from '@liquio/back-core';

export type RedisConfig = Omit<RedisClientConfig, 'getLog' | 'prefix'>;

/**
 * Manager's redis client: a thin, singleton-per-process binding of `@liquio/back-core`'s
 * `RedisClient`. `get`/`set`/`delete` are inherited unchanged.
 */
export class RedisClient extends BackCoreRedisClient {
  static singleton: RedisClient;

  /**
   * @param {RedisConfig} config Config object.
   */
  constructor(config: RedisConfig) {
    if (RedisClient.singleton) {
      return RedisClient.singleton;
    }

    super({ ...config, prefix: process.env.npm_package_name, getLog: () => global.log });
    RedisClient.singleton = this;
  }
}
