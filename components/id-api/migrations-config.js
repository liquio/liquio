const { Config } = require('@liquio/back-core');
const { z } = require('zod');

const result = Config.load({
  defaultConfigPath: process.cwd() + '/config',
  envPrefix: 'LIQUIO_CFG_ID_',
  transform: (raw) => {
    const configData = raw.config;
    const env = process.env.NODE_ENV || configData.default_env || 'test';
    const envConf = configData[env];

    if (!envConf) {
      throw new Error(`Config for env [${env}] is not defined or missing 'db' section.`);
    }

    return envConf;
  },
  schema: z.looseObject({ db: z.looseObject({}) }),
}).toObject();

module.exports = result.db;
