import fs from 'node:fs';
import path from 'node:path';

import { Config, resolveEnvPrefix } from '@liquio/back-core';

import { buildNotificationConfigSchema } from './config.schema';
import type { NotificationConfig } from './config.types';

const CONFIG_PATH = process.env.CONFIG_PATH || path.join(process.cwd(), '../config/notification');

if (!fs.existsSync(CONFIG_PATH)) {
  throw new Error('Config directory does not exist.');
}

// Load merged config from CONFIG_PATH and optional SECRET_PATH.
const mergedConfig: any = Config.load({
  configPath: CONFIG_PATH,
  envPrefix: resolveEnvPrefix('LIQUIO_CFG_NOTIFICATION'),
  transform: (raw: any) => raw.config,
  schema: buildNotificationConfigSchema(),
}).toObject();

// Init config versions.
const versionsConfText = fs.readFileSync(path.join(process.cwd(), './src/config/versions.json.default'), 'utf8');
const versionsConf = JSON.parse(versionsConfText || '{}');

// Get NODE_ENV.
export const env: string = process.env.NODE_ENV || mergedConfig.default_env || 'test';

// Resolve current environment config.
const currentEnvConf = mergedConfig[env];

// Add version config.
export const conf: NotificationConfig & Record<string, any> = { ...currentEnvConf, ...versionsConf };
