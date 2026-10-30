import { Log } from '@liquio/back-core';

import { Db } from './lib/db';
import { setAppContext } from './lib/context';
import { Providers } from './providers';
import { Models } from './models';
import { Router } from './router';
import { validateAuthConfig } from './lib/config_validation';

/**
 * Validates auth config, inits DB, providers, models, optional CLI and starts the router.
 * Throws when the auth config is invalid; the entry point turns that into a process exit.
 */
export async function bootstrap(config: any, log: Log) {
  // Do not start with missing or publicly known auth tokens.
  const authConfigProblems = validateAuthConfig(config);
  if (authConfigProblems.length) {
    log.save('config-validation-error', { problems: authConfigProblems }, 'error');
    throw new Error(`Invalid auth config: ${authConfigProblems.join('; ')}`);
  }

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
