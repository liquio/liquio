const { Config, resolveEnvPrefix } = require('@liquio/back-core');
const { z } = require('zod');

module.exports = Config.load({
  defaultConfigPath: '../config/register',
  envPrefix: resolveEnvPrefix('LIQUIO_CFG_REGISTER'),
  schema: z.looseObject({ db: z.looseObject({}) }),
}).toObject().db;
