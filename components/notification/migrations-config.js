const Multiconf = require('multiconf');
const fs = require('fs');
const CONFIG_PATH = process.env.CONFIG_PATH || '../config/notification';
const SECRET_PATH = process.env.SECRET_PATH;
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_NOTIFICATION';
const { config } = Multiconf.get([CONFIG_PATH, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])], `${LIQUIO_CONFIG_PREFIX}_`);
module.exports = config[config.default_env].db;
