// Import.
import fs from 'node:fs';

import Multiconf from 'multiconf';

import { setAppContext } from './lib/context';
import ConsoleLogProvider from './lib/log/providers/console';
import Db from './lib/db';
import Log from './lib/log';
import Models from './models';
import Router from './router';
import typeOf from './lib/type_of';

// Init.
const CONFIG_PATH = process.env.CONFIG_PATH || '../config/persist-link';
const SECRET_PATH = process.env.SECRET_PATH;
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_PERSIST_LINK';
const config = Multiconf.get(
  [CONFIG_PATH, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])],
  `${LIQUIO_CONFIG_PREFIX}_`,
) as any;
const consoleLogProvider = new ConsoleLogProvider(config.log?.console?.name, { excludeParams: config.log?.excludeParams });
const log = new Log([consoleLogProvider], ['console']);
setAppContext({ config, log, typeOf });

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
