const { Config, resolveEnvPrefix } = require('@liquio/back-core');

module.exports = Config.load({
  defaultConfigPath: '../config/register',
  envPrefix: resolveEnvPrefix('LIQUIO_CFG_REGISTER'),
}).toObject().db;
