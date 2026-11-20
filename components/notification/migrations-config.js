const { Config, resolveEnvPrefix } = require('@liquio/back-core');
const { z } = require('zod');
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const config = Config.load({
  defaultConfigPath: '../config/notification',
  envPrefix: resolveEnvPrefix('LIQUIO_CFG_NOTIFICATION'),
  transform: (raw) => raw.config,
  schema: z.looseObject({ default_env: z.string() }).superRefine((cfg, ctx) => {
    if (!isObject(cfg[cfg.default_env]?.db)) {
      ctx.addIssue({ code: 'custom', path: [cfg.default_env, 'db'], message: 'is not defined' });
    }
  }),
}).toObject();
module.exports = config[config.default_env].db;
