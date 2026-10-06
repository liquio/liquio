import { IdApiClient } from './client';
import { IdApiConfig } from './types';

// Constants.
const ERROR_MESSAGE_NOT_INITIALIZED = 'Id-api client is not initialized. Pass a config on the first call.';

let singleton: IdApiClient | undefined;

/**
 * Create a new, independent id-api client.
 * @param {IdApiConfig} [config] Id-api client config.
 * @returns {IdApiClient}
 */
export function createIdApiClient(config?: IdApiConfig): IdApiClient {
  return new IdApiClient(config);
}

/**
 * Get the process-wide id-api client for plain Express apps. The first call creates it from `config`,
 * later calls return the same instance and ignore `config`.
 * @param {IdApiConfig} [config] Id-api client config, required on the first call.
 * @returns {IdApiClient}
 * @throws {Error} When called without a config before the client is created.
 */
export function getIdApiClient(config?: IdApiConfig): IdApiClient {
  if (!singleton) {
    if (!config) {
      throw new Error(ERROR_MESSAGE_NOT_INITIALIZED);
    }
    singleton = new IdApiClient(config);
  }

  return singleton;
}

/**
 * Reset the process-wide id-api client (for tests and reconfiguration).
 */
export function resetIdApiClient(): void {
  singleton = undefined;
}
