import { Log, ConsoleLogProvider } from '@liquio/back-core';

import { initialize as initializeConfig } from './lib/config';
import { Db } from './lib/db';
import { Providers } from './providers';
import { Models } from './models';
import { Router } from './router';
import { validateAuthConfig } from './lib/config_validation';

// Init config.
const config = initializeConfig();

// Init log.
const consoleLogProvider = new ConsoleLogProvider('console', { excludeParams: config.log.excludeParams });
// Activate providers specified in config.log.console (array of provider names).
// If not set, fall back to enabling the 'console' provider so logs appear in docker logs.
const activeProviders = Array.isArray(config.log?.console) && config.log.console.length ? config.log.console : ['console'];
const log = new Log([consoleLogProvider], activeProviders);

// Globals.
global.log = log;

// Do not start with missing or publicly known auth tokens.
const authConfigProblems = validateAuthConfig(config);
if (authConfigProblems.length) {
  log.save('config-validation-error', { problems: authConfigProblems }, 'error');
  process.exit(1);
}

// Set process title.
process.title = config.app.processTitle;

// Start async thread.
(async () => {
  // Init DB.
  global.db = await Db.getInstance(config.db);

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
})();
