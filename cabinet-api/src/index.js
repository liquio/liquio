const Multiconf = require('multiconf');

const Log = require('./lib/log');
const Db = require('./lib/db');
const Models = require('./models');
const Router = require('./router');
const RedisClient = require('./lib/redis_client');
const ConsoleLogProvider = require('./lib/log/providers/console');
const typeOf = require('./lib/type_of');

const CONFIG_PATH = process.env.CONFIG_PATH || '../config/cabinet-api';
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_CABINET';

// Start async thread.
(async () => {
  // Init config.
  const config = Multiconf.get(CONFIG_PATH, `${LIQUIO_CONFIG_PREFIX}_`);
  global.config = config;

  // Init log.
  const consoleLogProvider = new ConsoleLogProvider(config.log.console.name, { excludeParams: config.log.excludeParams });
  const log = new Log([consoleLogProvider], ['console']);
  global.log = log;

  global.typeOf = typeOf;

  // Init DB.
  const db = await Db.getInstance(config.db);
  global.db = db;

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
})();
