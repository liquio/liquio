import fs from 'node:fs';

import Multiconf from 'multiconf';

import { bootstrap } from './bootstrap';

const CONFIG_PATH = process.env.CONFIG_PATH || '../config/event';
const SECRET_PATH = process.env.SECRET_PATH;
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_EVENT';

async function main() {
  const config = Multiconf.get([CONFIG_PATH, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])], `${LIQUIO_CONFIG_PREFIX}_`);

  await bootstrap(config);
}

main();
