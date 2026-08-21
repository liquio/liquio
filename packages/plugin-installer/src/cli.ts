#!/usr/bin/env node
import fs from 'node:fs';
import Multiconf from 'multiconf';
import { ConsoleLogProvider, Log } from '@liquio/back-core';
import { installPlugins } from './install';

const configDir = process.env.CONFIG_PATH || '/var/www/config';
const secretPath = process.env.SECRET_PATH;
const envConfigPrefix = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_PLUGIN_INSTALLER_';

const log = new Log([new ConsoleLogProvider('console')], ['console']);

installPlugins(
  {
    configDir,
    envConfigPrefix,
    installDir: process.env.PLUGINS_INSTALL_DIR || '/var/www/plugins',
    registry: process.env.NPM_REGISTRY || 'https://registry.npmjs.org',
  },
  {
    loadConfig: (dir, prefix) => Multiconf.get([dir, ...(secretPath && fs.existsSync(secretPath) ? [secretPath] : [])], prefix),
    log: log.save.bind(log),
  },
).catch((err) => {
  log.save('plugin-installer-error', { message: err.message, error: err }, 'error');
  process.exit(1);
});
