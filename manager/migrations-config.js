const Multiconf = require('multiconf');
const CONFIG_PATH = process.env.CONFIG_PATH || '../config/manager';
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_MANAGER';
const config = Multiconf.get(CONFIG_PATH, `${LIQUIO_CONFIG_PREFIX}_`);
module.exports = config.db;
