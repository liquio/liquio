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
  config = Multiconf.get([configPath, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])], 'KITSOFT_BPMN_EVENT_');
  return config;
}

module.exports = {
  getConfig,
  loadConfig,
};
