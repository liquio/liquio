import Multiconf from 'multiconf';
import fs from 'node:fs';
import path from 'node:path';

const CONFIG_PATH = process.env.CONFIG_PATH || path.join(process.cwd(), '../config/notification');
const SECRET_PATH = process.env.SECRET_PATH;
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_NOTIFICATION';

if (!fs.existsSync(CONFIG_PATH)) {
  throw new Error('Config directory does not exist.');
}

// Load merged config from CONFIG_PATH and optional SECRET_PATH.
const mergedConfig: any = (Multiconf.get([CONFIG_PATH, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])], `${LIQUIO_CONFIG_PREFIX}_`) as any).config;

// Init config versions.
const versionsConfText = fs.readFileSync(path.join(process.cwd(), './src/config/versions.json.default'), 'utf8');
const versionsConf = JSON.parse(versionsConfText || '{}');

// Get NODE_ENV.
export const env: string = process.env.NODE_ENV || mergedConfig.default_env || 'test';
if (typeof env !== 'string' || !env) {
  throw new Error(`ENV [${env}] is not defined.`);
}

// Resolve current environment config.
const currentEnvConf = mergedConfig[env];
if (typeof currentEnvConf === 'undefined' || typeof currentEnvConf.db === 'undefined') {
  throw new Error('Variable currentEnvConf.db is not defined.');
}

// Add version config.
export const conf: any = { ...currentEnvConf, ...versionsConf };
