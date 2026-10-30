// Init config.
import path from 'node:path';

import { Log } from '@liquio/back-core';

// eslint-disable-next-line import-x/order -- global.conf must be set before ./app and the adapters load.
import * as config from './config/config';

global.conf = config.conf;

import start, { buildAdapters } from './bootstrap';
import { typeOf } from './lib/type_of';
import { createServer } from './lib/tls_server';
import { createConsoleLogProvider } from './lib/console_log_provider';

global.typeOf = typeOf;
// Constants.
const DEFAULT_PROCESS_TITLE = 'notify';
const ADMIN_DIRECTORY = '/admin';

// Set process title.
process.title = config.conf.processTitle || DEFAULT_PROCESS_TITLE;

// Logs.
const consoleLogProvider = createConsoleLogProvider((config as any).log);
const log = new Log([consoleLogProvider], ['console']);
global.log = log;

// Log unhandled errors.
process.on('unhandledRejection', (error: any) => {
  const { stack, message } = error || {};
  log.save('unhandled-rejection', { stack, message }, 'error');
  process.exit(1);
});
process.on('uncaughtException', (error: any) => {
  const { stack, message } = error || {};
  log.save('unhandled-rejection', { stack, message }, 'error');
  process.exit(1);
});

// Warn about default admin password and define adapters to use.
const adapters = buildAdapters(config.conf, log);

// Start Notify Core.
const app = start(config, path.join(__dirname, ADMIN_DIRECTORY), adapters as any);

// Start server listening.
(async () => {
  await (async () => {
    return new Promise((resolve) => {
      const port = config.conf.port || process.env.port || 8080;
      // Plain HTTP unless conf.tls.enabled is set; throws (fails fast) on unreadable cert/key/ca files.
      const server = createServer(app, config.conf.tls);
      const scheme = config.conf.tls?.enabled ? 'https' : 'http';
      server.listen(port, function () {
        log.save('server-started', { url: `${scheme}://localhost:${port}`, port }, 'info');
        resolve(undefined);
      });
    });
  })();
})();
