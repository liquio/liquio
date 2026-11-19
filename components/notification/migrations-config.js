const { Config, resolveEnvPrefix } = require('@liquio/back-core');
const config = Config.load({
  defaultConfigPath: '../config/notification',
  envPrefix: resolveEnvPrefix('LIQUIO_CFG_NOTIFICATION'),
  transform: (raw) => raw.config,
}).toObject();
module.exports = config[config.default_env].db;
