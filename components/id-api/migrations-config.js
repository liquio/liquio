const Multiconf = require('multiconf');
const fs = require('fs');

const CONFIG_PATH = process.env.CONFIG_PATH || process.cwd() + '/config';
const SECRET_PATH = process.env.SECRET_PATH;

const raw = Multiconf.get(
  [CONFIG_PATH, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])],
  'LIQUIO_CFG_ID_'
);

const configData = raw.config;
const env = process.env.NODE_ENV || configData.default_env || 'test';
const envConf = configData[env];

if (!envConf || !envConf.db) {
  throw new Error(`Config for env [${env}] is not defined or missing 'db' section.`);
}

module.exports = envConf.db;
