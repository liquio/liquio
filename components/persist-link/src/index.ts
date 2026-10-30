// Import.
import fs from 'node:fs';

import Multiconf from 'multiconf';
import { Log } from '@liquio/back-core';

import { setAppContext } from './lib/context';
import { bootstrap } from './bootstrap';
import typeOf from './lib/type_of';
import { createConsoleLogProvider } from './lib/console_log_provider';

// Init.
const CONFIG_PATH = process.env.CONFIG_PATH || '../config/persist-link';
const SECRET_PATH = process.env.SECRET_PATH;
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_PERSIST_LINK';
const config = Multiconf.get([CONFIG_PATH, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])], `${LIQUIO_CONFIG_PREFIX}_`) as any;
const consoleLogProvider = createConsoleLogProvider(config.log);
const log = new Log([consoleLogProvider], ['console']);
setAppContext({ config, log, typeOf });

// Process title.
process.title = 'persist-link';

// Start async thread.
(async () => {
  await bootstrap(config);
})();
