import { existsSync } from 'fs';

import multiconf from 'multiconf';

import { bootstrap } from './bootstrap';

const CONFIG_PATH = process.env.CONFIG_PATH || '../config/cabinet-api';
const SECRET_PATH = process.env.SECRET_PATH;
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_CABINET';

// Start async thread.
async function main(): Promise<void> {
  // Init config.
  const config = multiconf.get([CONFIG_PATH, ...(SECRET_PATH && existsSync(SECRET_PATH) ? [SECRET_PATH] : [])], `${LIQUIO_CONFIG_PREFIX}_`) as any;

  await bootstrap(config);
}

main();
