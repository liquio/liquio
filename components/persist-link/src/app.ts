// Import.
import fs from 'node:fs';

import Multiconf from 'multiconf';
import { Log, Sandbox } from '@liquio/back-core';

import { getLog, setAppContext } from './lib/context';
import Db from './lib/db';
import Models from './models';
import Router from './router';
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

// Init sandbox (shared by the whole process, see `Sandbox.getInstance()`).
// Template jsonMap code must never run outside isolated-vm, so the isolation level is not configurable.
new Sandbox({ ...config.sandbox, isolationLevel: 'isolated-vm' as any, getLog });

// Process title.
process.title = 'persist-link';

// Start async thread.
(async () => {
  // Init DB.
  const db = await Db.getInstance(config.db);
  setAppContext({ db });

  // Init models.
  const models = new Models(config);
  models.initModels();

  // Start server.
  const router = new Router(config);
  await router.init();
})();
