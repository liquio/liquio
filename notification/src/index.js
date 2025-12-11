// Init config.
const config = require('./config/config');
global.conf = config.conf;

const path = require('path');
const start = require('./app');
const testConsoleSmsAdapter = require('./adapters/test_console_sms_adapter');
const AppIdentHeaders = require('./lib/app_ident_headers');
const Log = require('./lib/log');
const ConsoleLogProvider = require('./lib/log/providers/console');
global.typeOf = require('./lib/type_of');
// Constants.
const DEFAULT_PROCESS_TITLE = 'notify';
const ADMIN_DIRECTORY = '/admin';
const ADAPTERS_LIST = { testConsoleSmsAdapter };
const DEFAULT_SMS_ADAPTER_NAME = 'testConsoleSmsAdapter';

// Set process title.
process.title = config.conf.processTitle || DEFAULT_PROCESS_TITLE;

// Logs.
const consoleLogProvider = new ConsoleLogProvider(config.log?.console?.name, { excludeParams: config.log?.excludeParams });
const log = new Log([consoleLogProvider], ['console']);
global.log = log;

// Log unhandled errors.
process.on('unhandledRejection', (error) => {
  const { stack, message } = error || {};
  log.save('unhandled-rejection', { stack, message }, 'error');
  process.exit(1);
});
process.on('uncaughtException', (error) => {
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
const server = start(config, path.join(__dirname, ADMIN_DIRECTORY), adapters);

// App info in headers.
AppIdentHeaders.add(server);

// Expose Name and Version headers.
server.use(function (req, res, next) {
  next();
});

// Start server listening.
(async () => {
  await (async () => {
    return new Promise((resolve) => {
      server.listen(config.conf.port || process.env.port || 8080, function () {
        log.save('server-started', { url: server.url, port: config.conf.port || process.env.port || 8080 }, 'info');
        resolve();
      });
    });
  })();
})();
