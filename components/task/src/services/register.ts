import { getRedisClient } from '../lib/context';

// Constants.
const REGISTER_CACHE_KEYS_PATTERN = 'bpmn-register.key.*';

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
