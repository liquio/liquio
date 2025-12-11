const Multiconf = require('multiconf');

/**
 * Configuration module.
 * Exports a singleton config object and an initialize function.
 */
let config = null;

/**
 * Initialize configuration by reading from the config file.
 * @returns {object} The loaded configuration object.
 */
function initialize() {
  if (config) {
    return config;
  }

  const CONFIG_PATH = process.env.CONFIG_PATH || '../config/filestorage';
  const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_FILESTORAGE';
  config = Multiconf.get(CONFIG_PATH, `${LIQUIO_CONFIG_PREFIX}_`);

  return config;
}

/**
 * Get the current configuration object.
 * @returns {object} The configuration object.
 * @throws {Error} If configuration has not been initialized.
 */
function getConfig() {
  if (!config) {
    throw new Error('Configuration not initialized. Call initialize() first.');
  }
  return config;
}

module.exports = {
  initialize,
  getConfig,
  get config() {
    return getConfig();
  }
};
