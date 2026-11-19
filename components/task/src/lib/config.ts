import { Config } from '@liquio/back-core';

import { setAppContext } from './context';

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
 * Load config.
 * @param {string} configPath Path to config directory.
 * @returns {object} Config object.
 */
export function loadConfig(configPath: string): Record<string, any> {
  config = Config.load({ configPath, envPrefix: 'LIQUIO_BPMN_TASK_' }).toObject();
  setAppContext({ config });
  return config;
}
