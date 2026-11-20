import { Log } from '@liquio/back-core';

import { Db } from './lib/db';
import { setAppContext } from './lib/context';
import { Providers } from './providers';
import { Models } from './models';
import { Router } from './router';
import { FilestorageConfig } from './lib/config.types';

/**
 * Inits DB, providers, models, optional CLI and starts the router.
 */
export async function bootstrap(config: FilestorageConfig, _log: Log) {
  // Init DB.
  setAppContext({ db: await Db.getInstance(config.db) });

  // Init providers.
  const providers = new Providers(config.providers);
  providers.init();

  // Init models.
  const models = new Models(config, providers.activeProvider);
  models.init();

  if (config.app.cliEnabled) {
    const { Cli } = await import('./lib/cli');
    const cli = new Cli(config, models);
    await cli.init();
  }

  // Start server.
  const router = new Router(config);
  await router.init();

  return { providers, models, router };
}
