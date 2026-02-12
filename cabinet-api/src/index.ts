import multiconf from 'multiconf';

import Log from './lib/log';
import Db from './lib/db';
import Models from './models';
import Router from './router';
import RedisClient from './lib/redis_client';
import ConsoleLogProvider from './lib/log/providers/console';
import typeOf from './lib/type_of';

const CONFIG_PATH = process.env.CONFIG_PATH || '../config/cabinet-api';
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_CABINET';

// Start async thread.
async function main(): Promise<void> {
  // Init config.
  const config = multiconf.get(CONFIG_PATH, `${LIQUIO_CONFIG_PREFIX}_`);
  global.config = config as any;

  // Init log.
  const consoleLogProvider = new ConsoleLogProvider(config.log.console.name, {
    excludeParams: config.log.excludeParams,
  });
  const log = new Log([consoleLogProvider], ['console']);
  global.log = log;

  global.typeOf = typeOf;

  // Init DB.
  const db = await Db.getInstance(config.db);
  global.db = db;

  // Init models.
  new Models();

  // Initialize Redis instance client if enabled.
  if (config?.redis?.isEnabled) {
    new RedisClient({
      host: config.redis.host,
      port: config.redis.port,
      defaultTtl: config.redis.defaultTtl,
    });
  }

  // Start server.
  const router = new Router();
  await router.init();
}

main();
