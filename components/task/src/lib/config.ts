import { Config } from '@liquio/back-core';

import { setAppContext } from './context';
import type { TaskConfig } from './config.types';

let config: TaskConfig | undefined;

/**
 * Get config instance.
 * @returns {object} Config object.
 */
export function getConfig(): TaskConfig {
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
export function loadConfig(configPath: string): TaskConfig {
  config = Config.load<TaskConfig>({ configPath, envPrefix: 'LIQUIO_BPMN_TASK_' }).toObject();
  setAppContext({ config });
  return config;
}
