// Init config.
import path from 'node:path';
import * as config from './config/config';

global.conf = config.conf;

import start from './app';
import { testConsoleSmsAdapter } from './adapters/test_console_sms_adapter';
import { AppIdentHeaders } from './lib/app_ident_headers';
import { Log } from './lib/log';
import { ConsoleLogProvider } from './lib/log/providers/console';
import { typeOf } from './lib/type_of';

global.typeOf = typeOf;
// Constants.
const DEFAULT_PROCESS_TITLE = 'notify';
const ADMIN_DIRECTORY = '/admin';
const ADAPTERS_LIST: Record<string, unknown> = { testConsoleSmsAdapter };
const DEFAULT_SMS_ADAPTER_NAME = 'testConsoleSmsAdapter';

// Set process title.
process.title = config.conf.processTitle || DEFAULT_PROCESS_TITLE;

// Logs.
const consoleLogProvider = new ConsoleLogProvider((config as any).log?.console?.name, { excludeParams: (config as any).log?.excludeParams });
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

// Define adapters to use.
if (!config.conf.defaultMessenger) {
  log.save('sms-adapter-warning', { message: 'SMS adapter name not defined. Default will be used.' }, 'warn');
}
const smsAdapterName = config.conf.defaultMessenger || DEFAULT_SMS_ADAPTER_NAME;
log.save('sms-adapter-used', { smsAdapterName });
const adapters = {
  sms: ADAPTERS_LIST[smsAdapterName],
};

// Check.
if (!adapters.sms) {
  log.save('sms-adapter-initialization-error', { smsAdapterName }, 'error');
}

// Start Notify Core.
const server = start(config, path.join(__dirname, ADMIN_DIRECTORY), adapters as any);

// App info in headers.
AppIdentHeaders.add(server);

// Expose Name and Version headers.
server.use(function (req: any, res: any, next: any) {
  next();
});

// Start server listening.
(async () => {
  await (async () => {
    return new Promise((resolve) => {
      server.listen(config.conf.port || process.env.port || 8080, function () {
        log.save('server-started', { url: server.url, port: config.conf.port || process.env.port || 8080 }, 'info');
        resolve(undefined);
      });
    });
  })();
})();
