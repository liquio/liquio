const nconf = require('nconf');
const fs = require('fs');

const file = process.env.CONFIG_PATH ? `${process.env.CONFIG_PATH}/config.json` : process.cwd() + '/config/config.json';
if (!fs.existsSync(file) && !process.env['LIQUIO_ID_CONFIG']) {
  console.error(`Unable to load config: neither ${file} exists, nor LIQUIO_ID_CONFIG variable is set.`);
  process.exit(1);
}

const fileConfig = nconf.env().file({ file });
const env = process.env.NODE_ENV || fileConfig.get('default_env') || 'test';
let envConfig = process.env['LIQUIO_ID_CONFIG'];

if (typeof env !== 'string' || !env) {
  throw new Error(`ENV [${env}] is not defined.`);
}

let currentEnvConf = fileConfig.get(env);
if (typeof envConfig === 'string') {
  try {
    envConfig = JSON.parse(envConfig);
    console.log('Successful parsed ENV[LIQUIO_ID_CONFIG].');
  } catch (error) {
    throw new Error(`LIQUIO_ID_CONFIG is invalid json: ${error}.`);
  }

  if (typeof envConfig[env] === 'undefined') {
    throw new Error(`LIQUIO_ID_CONFIG [${env}] is not defined object config.`);
  }

  currentEnvConf = envConfig[env];
}
if (typeof currentEnvConf === 'undefined' || typeof currentEnvConf.db === 'undefined') {
  throw new Error('Variable currentEnvConf.db is not defined.');
}

module.exports = currentEnvConf.db;
