import { Config, resolveEnvPrefix } from '@liquio/back-core';

import { managerConfigSchema } from './config.schema';
import type { ManagerConfig } from './config.types';

export const DEFAULT_CONFIG_PATH = '../config/manager';
export const ENV_PREFIX_BASE = 'LIQUIO_CFG_MANAGER';

/**
 * Loads the manager configuration from files, the secret directory and environment variables.
 * @returns Merged configuration object.
 */
export function loadManagerConfig(): ManagerConfig {
  return Config.load<ManagerConfig>({
    defaultConfigPath: DEFAULT_CONFIG_PATH,
    envPrefix: resolveEnvPrefix(ENV_PREFIX_BASE),
    schema: managerConfigSchema,
  }).toObject();
}
