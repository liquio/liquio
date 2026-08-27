import Multiconf from 'multiconf';
import fs from 'node:fs';

let config: any = {};

/**
 * Get config instance.
 * @returns {object} Config object.
 */
export function getConfig(): any {
  if (!config) {
    throw new Error('Config not loaded');
  }
  return config;
}

/**
 * Load config.
 * @param {string} configPath Path to config directory.
 */
export function loadConfig(configPath: string): any {
  const SECRET_PATH = process.env.SECRET_PATH;
  config = Multiconf.get([configPath, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])], 'KITSOFT_BPMN_EVENT_');
  return config;
}
