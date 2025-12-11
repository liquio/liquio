
const redis = require('redis');
const axios = require('axios');

// Constants.
const CACHE_KEY_PREFIX = 'static-url';
const DEFAULT_TIMEOUT = 5000;

/**
 * Remote static cache service.
 */
class RemoteStaticCache {
  /**
   * Remote static cache service constructor.
   * @param {object} config Remote static cache config.
   * @param {object} redisConfig Redis config.
   */
  constructor(config, redisConfig) {
    // Singleton.
    if (!RemoteStaticCache.singleton) {
      // Define params.
      // Redis config.
      const { isEnabled: isRedisEnabled, host, port } = redisConfig || {};

      // Remote static cache config.
      const { useCache = false } = config || {};
      this.client = (isRedisEnabled && useCache)
        ? host && port ? redis.createClient(port, host) : undefined
        : undefined;
      if (this.client) { log.save('remote-static-cache-initialized', { useCache, host, port }); } else { log.save('remote-static-cache-not-initialized', { useCache }); }
      // Define singleton.
      RemoteStaticCache.singleton = this;
    }

    // Return singleton.
    return RemoteStaticCache.singleton;
  }

  /**
   * Get cache by remote url.
   * @param {string} url Remote url.
   * @param {object} extraOptions Extra options.
   */
  async getAndUpdateByRemoteUrl(url, extraOptions) {
    // Form key to get data.
    const key = this.formKeyFromUrl(url);

    // Check if connected to Redis.
    if (!this.client) { log.save('redis-client-is-not-defined-for-static-cache'); return; }

    // Get cache as string.
    const dataString = await new Promise((resolve, reject) => {
      this.client.get(key, (error, value) => {
        if (error) return reject(error);
        resolve(value);
      });
    });

    // Do request to update data.
    const { timeout = DEFAULT_TIMEOUT } = extraOptions || {};
    axios({ url, method: 'GET', timeout })
      .then((response) => {
        // Set cache as string.
        const resString = JSON.stringify(response.data);
        this.client.set(key, resString);
      })
      .catch((err) => {
        log.save('set-data-by-remote-url-error', err, 'error');
      });

    // Return data as object.
    const data = dataString && JSON.parse(dataString);
    return data;
  }

  /**
   * @private
   * Form key from url.
   * @param {string} url Remote url.
   */
  formKeyFromUrl(url) {
    const urlBase64 = Buffer.from(url).toString('base64');
    return `${CACHE_KEY_PREFIX}:${urlBase64}`;
  }
}

module.exports = RemoteStaticCache;
