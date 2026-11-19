import { Config, resolveEnvPrefix } from '@liquio/back-core';

/**
 * Configuration module.
 * Exports a singleton config object and an initialize function.
 */
let config: any = null;

/**
 * Initialize configuration by reading from the config file.
 * @returns {object} The loaded configuration object.
 */
export function initialize() {
  if (config) {
    return config;
  }

  config = Config.load<any>({
    defaultConfigPath: '../config/filestorage',
    envPrefix: resolveEnvPrefix('LIQUIO_CFG_FILESTORAGE'),
  }).toObject();

  return config;
}

/**
 * Get the current configuration object.
 * @returns {object} The configuration object.
 * @throws {Error} If configuration has not been initialized.
 */
export function getConfig() {
  if (!config) {
    throw new Error('Configuration not initialized. Call initialize() first.');
  }
  return config;
}
