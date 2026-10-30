import { Log, ConsoleLogProvider } from '@liquio/back-core';

import Db from './lib/db';
import Models from './models';
import Router from './router';
import RedisClient from './lib/redis_client';
import typeOf from './lib/type_of';
import { initIdApiClient } from './lib/id_api';
import { setAppContext } from './lib/context';

/**
 * Init globals, DB, models, Redis (if enabled) and start the HTTP server.
 * @param config Cabinet-api config.
 */
export async function bootstrap(config: any): Promise<void> {
  setAppContext({ config });

  // Init log.
  const consoleLogProvider = new ConsoleLogProvider(config.log.console.name, {
    excludeParams: config.log.excludeParams,
    disableDefaultRedaction: config.log.disableDefaultRedaction === true,
  });
  const log = new Log([consoleLogProvider], ['console']);
  setAppContext({ log });

  setAppContext({ typeOf });

  initIdApiClient({ ...config.auth.LiquioId, authRedirectUrl: config.auth.authRedirectUrl });

  // Init DB.
  const db = await Db.getInstance(config.db);
  setAppContext({ db });

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
