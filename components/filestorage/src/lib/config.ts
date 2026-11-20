import { Config, resolveEnvPrefix } from '@liquio/back-core';

import { FilestorageConfig } from './config.types';
import { filestorageConfigSchema } from './config.schema';

/**
 * Configuration module.
 * Exports a singleton config object and an initialize function.
 */
let config: FilestorageConfig | null = null;

/**
 * Initialize configuration by reading from the config file.
 * @returns {object} The loaded configuration object.
 */
export function initialize(): FilestorageConfig {
  if (config) {
    return config;
  }

  config = Config.load<FilestorageConfig>({
    defaultConfigPath: '../config/filestorage',
    envPrefix: resolveEnvPrefix('LIQUIO_CFG_FILESTORAGE'),
    schema: filestorageConfigSchema,
  }).toObject();

  return config;
}

/**
 * Get the current configuration object.
 * @returns {object} The configuration object.
 * @throws {Error} If configuration has not been initialized.
 */
export function getConfig(): FilestorageConfig {
  if (!config) {
    throw new Error('Configuration not initialized. Call initialize() first.');
  }
  return config;
}
