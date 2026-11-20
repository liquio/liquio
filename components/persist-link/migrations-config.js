const { Config, resolveEnvPrefix } = require('@liquio/back-core');
const { z } = require('zod');

// Before this change the default prefix had a double underscore; it is still accepted.
const LEGACY_DEFAULT_PREFIX = 'LIQUIO_CFG_PERSIST_LINK__';

const config = Config.load({
  defaultConfigPath: '../config/persist-link',
  envPrefix: resolveEnvPrefix('LIQUIO_CFG_PERSIST_LINK'),
  legacyEnvPrefixes: process.env.LIQUIO_CONFIG_PREFIX ? [] : [LEGACY_DEFAULT_PREFIX],
  schema: z.looseObject({ db: z.looseObject({}) }),
}).toObject();

module.exports = config.db;
