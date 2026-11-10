import { getRegisterApiClient, RegisterApiClient } from '@liquio/back-core';

import { getLog, getRedisClient } from './context';

// Constants.
const DEFAULT_TIMEOUT = 30000;
const REGISTER_CACHE_KEYS_PATTERN = 'bpmn-register.key.*';

/**
 * Init the shared register client from the `register` config section. Call once on startup,
 * after the global log is set. Everywhere else use `getRegisterApiClient()` without arguments.
 * @param {object} registerConfig Register config section (`config.register`).
 * @returns {RegisterApiClient}
 */
export function initRegisterApiClient(registerConfig: Record<string, any> = {}): RegisterApiClient {
  return getRegisterApiClient({
    server: registerConfig.server,
    port: registerConfig.port,
    token: registerConfig.token,
    timeout: registerConfig.timeout || DEFAULT_TIMEOUT,
    getLog: () => getLog(),
  });
}

/**
 * Set the default records sort (newest first) when the params have none. Mutates and returns the same object.
 * @param {object} params Records query params.
 * @returns {object} The same params object.
 */
export function withDefaultRecordsSort<T extends Record<string, any>>(params: T): T {
  if (typeof params.sort === 'undefined') {
    (params as Record<string, any>).sort = { created_at: 'desc' };
  }

  return params;
}

/**
 * Delete register cache.
 * @returns {Promise<number>} Deleted keys count, `0` when Redis is disabled.
 */
export async function deleteRegisterCache(): Promise<number> {
  const redisClient = getRedisClient();
  if (redisClient) {
    return await redisClient.deleteMany(REGISTER_CACHE_KEYS_PATTERN);
  }

  return 0;
}
