import { Config, resolveEnvPrefix } from '@liquio/back-core';

import { adminApiConfigSchema } from './config.schema';
import { AdminApiConfig } from './config.types';

/**
 * Loads the admin-api configuration from files and environment variables.
 * @returns Merged config object.
 */
export function loadAdminApiConfig(): AdminApiConfig {
  return Config.load<AdminApiConfig>({
    defaultConfigPath: '../config/admin-api',
    envPrefix: resolveEnvPrefix('LIQUIO_CFG_ADMIN_API', 'HANDLER_'),
    schema: adminApiConfigSchema,
  }).toObject();
}
