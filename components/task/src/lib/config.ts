import Multiconf from 'multiconf';
import * as fs from 'node:fs';

const config: any = {};

/**
 * Get config instance.
 * @returns {object} Config object.
 */
export function getConfig() {
  if (!config) {
    throw new Error('Config not loaded');
  }
  return config;
}

/**
 * Load config.
 * @param {string} configPath Path to config directory.
 */
export function loadConfig(configPath) {
  const SECRET_PATH = process.env.SECRET_PATH;
  const config = Multiconf.get([configPath, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])], 'LIQUIO_BPMN_TASK_');
  global.config = config;
  return config;
}
