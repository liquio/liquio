import { Config, resolveEnvPrefix } from '@liquio/back-core';

import type { EventConfig } from './config.types';

let config: EventConfig | undefined;

/**
 * Get config instance.
 * @returns {object} Config object.
 */
export function getConfig(): EventConfig {
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
export function loadConfig(configPath?: string): EventConfig {
  config = Config.load<EventConfig>({
    configPath,
    defaultConfigPath: '../config/event',
    envPrefix: resolveEnvPrefix('LIQUIO_CFG_EVENT'),
  }).toObject();
  return config;
}
