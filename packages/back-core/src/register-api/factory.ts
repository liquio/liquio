import { RegisterApiClient } from './client';
import { RegisterApiErrorMessage } from './errors';
import { RegisterApiConfig } from './types';

let singleton: RegisterApiClient | undefined;

/**
 * Create a new, independent register-api client.
 * @param {RegisterApiConfig} [config] Register API client config.
 * @returns {RegisterApiClient}
 */
export function createRegisterApiClient(config?: RegisterApiConfig): RegisterApiClient {
  return new RegisterApiClient(config);
}

/**
 * Get the process-wide register-api client for plain Express apps. The first call creates it from `config`,
 * later calls return the same instance and ignore `config`.
 * @param {RegisterApiConfig} [config] Register API client config, required on the first call.
 * @returns {RegisterApiClient}
 * @throws {Error} When called without a config before the client is created.
 */
export function getRegisterApiClient(config?: RegisterApiConfig): RegisterApiClient {
  if (!singleton) {
    if (!config) {
      throw new Error(RegisterApiErrorMessage.NotInitialized);
    }
    singleton = new RegisterApiClient(config);
  }

  return singleton;
}

/**
 * Reset the process-wide register-api client (for tests and reconfiguration).
 */
export function resetRegisterApiClient(): void {
  singleton = undefined;
}
