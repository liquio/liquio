const { Config } = require('@liquio/back-core');

const raw = Config.load({ defaultConfigPath: process.cwd() + '/config', envPrefix: 'LIQUIO_CFG_ID_' }).toObject();

const configData = raw.config;
const env = process.env.NODE_ENV || configData.default_env || 'test';
const envConf = configData[env];

if (!envConf || !envConf.db) {
  throw new Error(`Config for env [${env}] is not defined or missing 'db' section.`);
}

module.exports = envConf.db;
