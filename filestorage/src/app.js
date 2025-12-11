const { initialize: initializeConfig } = require('./lib/config');
const Log = require('./lib/log');
const ConsoleLogProvider = require('./lib/log/providers/console');
const Db = require('./lib/db');
const Providers = require('./providers');
const Models = require('./models');
const Router = require('./router');

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

// Set process title.
process.title = config.app.processTitle;

// Set TLS options.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
    const CliController = require('./lib/cli');
    const cli = new CliController(config, models);
    await cli.init();
  }

  // Start server.
  const router = new Router(config);
  await router.init();
})();
