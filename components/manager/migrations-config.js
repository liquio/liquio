const { Config, resolveEnvPrefix } = require('@liquio/back-core');
const { z } = require('zod');

const config = Config.load({
  defaultConfigPath: '../config/manager',
  envPrefix: resolveEnvPrefix('LIQUIO_CFG_MANAGER'),
  schema: z.looseObject({ db: z.looseObject({}) }),
}).toObject();
module.exports = config.db;
