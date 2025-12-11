const Multiconf = require('multiconf');

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
  const config = Multiconf.get(configPath, 'LIQUIO_BPMN_TASK_');
  global.config = config;
  return config;
}

module.exports = {
  getConfig,
  loadConfig,
};
