import { Config, resolveEnvPrefix } from '@liquio/back-core';

/**
 * Loads the admin-api configuration from files and environment variables.
 * @returns Merged config object.
 */
export function loadAdminApiConfig(): Record<string, any> {
  return Config.load({
    defaultConfigPath: '../config/admin-api',
    envPrefix: resolveEnvPrefix('LIQUIO_CFG_ADMIN_API', 'HANDLER_'),
  }).toObject();
}
