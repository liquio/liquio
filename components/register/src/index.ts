import { Log, ConsoleLogProvider } from '@liquio/back-core';

import { config } from './lib/config';
import { bootstrap } from './bootstrap';

// Init.
const consoleLogProvider = new ConsoleLogProvider('console', {
  excludeParams: config.log.excludeParams,
  disableDefaultRedaction: config.log?.disableDefaultRedaction === true,
} as any);
const log = new Log([consoleLogProvider as any], ['console']);

// Log unhandled rejections.
process.on('unhandledRejection', (error: Error | undefined) => {
  const { stack, message } = error || {};
  log.save('unhandled-rejection', { stack, message }, 'error');
  process.exit(1);
});

// Set proxess title
process.title = config.app.processTitle;

// Start async thread.
bootstrap(config, { log }).catch((error: Error) => {
  log.save('bootstrap-error', { message: error?.message, stack: error?.stack }, 'error');
  process.exit(1);
});
