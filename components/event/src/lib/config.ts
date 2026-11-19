import { Config, resolveEnvPrefix } from '@liquio/back-core';

let config: Record<string, any> | undefined;

/**
 * Get config instance.
 * @returns {object} Config object.
 */
export function getConfig(): Record<string, any> {
  if (!config) {
    throw new Error('Config not loaded');
  }
  return config;
}

/**
 * Load the event config once (config dir, optional SECRET_PATH, env overrides).
 * @param {string} [configPath] Path to config directory (overrides CONFIG_PATH and the default).
 * @returns {object} Config object.
 */
export function loadConfig(configPath?: string): Record<string, any> {
  config = Config.load({
    configPath,
    defaultConfigPath: '../config/event',
    envPrefix: resolveEnvPrefix('LIQUIO_CFG_EVENT'),
  }).toObject();
  return config;
}
