const nconf = require('nconf');
const fs = require('fs');
const path = require('path');

const configDir = process.env.CONFIG_PATH || path.join(process.cwd(), '../config/notification');
if (!fs.existsSync(configDir)) {
  throw new Error('Config directory does not exist.');
}

// Init config file.
const fileConfig = nconf.env().file({ file: path.join(configDir, 'config.json') });

// Init config versions.
const versionsConfText = fs.readFileSync(path.join(process.cwd(), './src/config/versions.json.default'), 'utf8');
const versionsConf = JSON.parse(versionsConfText || '{}');

// Get NODE_ENV.
const env = process.env.NODE_ENV || fileConfig.get('default_env') || 'test';
let envConfig = process.env.LIQUIO_NOTIFY_CONFIG;
if (typeof env !== 'string' || !env) {
  throw new Error(`ENV [${env}] is not defined.`);
}

let currentEnvConf = fileConfig.get(env);
if (typeof envConfig === 'string') {
  try {
    envConfig = JSON.parse(envConfig);
    console.log('Successful parsed ENV[LIQUIO_NOTIFY_CONFIG].');
  } catch {
    throw new Error('LIQUIO_NOTIFY_CONFIG is invalid json.');
  }

  if (typeof envConfig[env] === 'undefined') {
    throw new Error(`LIQUIO_NOTIFY_CONFIG [${env}] is not defined object config.`);
  }

  currentEnvConf = envConfig[env];
}
if (typeof currentEnvConf === 'undefined' || typeof currentEnvConf.db === 'undefined') {
  throw new Error('Variable currentEnvConf.db is not defined.');
}

// Add version config.
const conf = { ...currentEnvConf, ...versionsConf };

module.exports = {
  env,
  conf,
};
