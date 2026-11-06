import { Log, ConsoleLogProvider } from '@liquio/back-core';

import { initialize as initializeConfig } from './lib/config';
import { bootstrap } from './bootstrap';
import { setAppContext } from './lib/context';

// Init config.
const config = initializeConfig();

// Init log.
const consoleLogProvider = new ConsoleLogProvider('console', {
  excludeParams: config.log.excludeParams,
  disableDefaultRedaction: config.log?.disableDefaultRedaction === true,
} as any);
// Activate providers specified in config.log.console (array of provider names).
// If not set, fall back to enabling the 'console' provider so logs appear in docker logs.
const activeProviders = Array.isArray(config.log?.console) && config.log.console.length ? config.log.console : ['console'];
const log = new Log([consoleLogProvider], activeProviders);

// App context.
setAppContext({ log });

// Set process title.
process.title = config.app.processTitle;

// Start async thread.
(async () => {
  try {
    await bootstrap(config, log);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith('Invalid auth config')) {
      throw error;
    }
    process.exit(1);
  }
})();
