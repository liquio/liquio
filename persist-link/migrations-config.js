const fs = require('node:fs');
const Multiconf = require('multiconf');

const CONFIG_PATH = process.env.CONFIG_PATH || '../config/persist-link';
const SECRET_PATH = process.env.SECRET_PATH;
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_PERSIST_LINK';
let config = Multiconf.get(CONFIG_PATH, `${LIQUIO_CONFIG_PREFIX}_`);
if (SECRET_PATH && fs.existsSync(SECRET_PATH)) {
	config = { ...config, ...Multiconf.get(SECRET_PATH, `${LIQUIO_CONFIG_PREFIX}_`) };
}
module.exports = config.db;
