const { Config, resolveEnvPrefix } = require('@liquio/back-core');

module.exports = Config.load({
  defaultConfigPath: '../config/filestorage',
  envPrefix: resolveEnvPrefix('LIQUIO_CFG_FILESTORAGE'),
}).toObject().db;
