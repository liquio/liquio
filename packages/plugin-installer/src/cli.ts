#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import Multiconf from 'multiconf';
import { installPlugins } from './install';

const configDir = process.env.CONFIG_PATH || '/var/www/config';
const secretPath = process.env.SECRET_PATH;
const envConfigPrefix = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_PLUGIN_INSTALLER_';

installPlugins(
  {
    configDir,
    envConfigPrefix,
    installDir: process.env.PLUGINS_INSTALL_DIR || '/var/www/plugins',
    registry: process.env.NPM_REGISTRY || 'https://registry.npmjs.org',
  },
  {
    existsSync: fs.existsSync,
    loadConfig: (dir, prefix) => Multiconf.get([dir, ...(secretPath && fs.existsSync(secretPath) ? [secretPath] : [])], prefix),
    mkdirSync: (p) => fs.mkdirSync(p, { recursive: true }),
    writeFileSync: fs.writeFileSync,
    execFileSync,
    log: console.log,
  },
).catch((err) => {
  console.error(err);
  process.exit(1);
});
