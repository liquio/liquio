const { Config, resolveEnvPrefix } = require('@liquio/back-core');

const config = Config.load({ defaultConfigPath: '../config/manager', envPrefix: resolveEnvPrefix('LIQUIO_CFG_MANAGER') }).toObject();
module.exports = config.db;
