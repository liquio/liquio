const Multiconf = require('multiconf');
const fs = require('fs');

let config = {};

/**
 * Get config instance.
 * @returns {object} Config object.
 */
function getConfig() {
  if (!config) {
    throw new Error('Config not loaded');
  }
  return config;
}

/**
 * Load config.
 * @param {string} configPath Path to config directory.
 */
function loadConfig(configPath) {
  const SECRET_PATH = process.env.SECRET_PATH;
  const config = Multiconf.get([configPath, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])], 'LIQUIO_BPMN_TASK_');
  global.config = config;
  return config;
}

module.exports = {
  getConfig,
  loadConfig,
};
