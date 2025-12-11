
const moment = require('moment');
const Multiconf = require('multiconf');
const Db = require('./lib/db');
const Log = require('./lib/log');
const ConsoleLogProvider = require('./lib/log/providers/console');
const MessageQueue = require('./lib/message_queue');
const RouterService = require('./services/router');
const GatewayBusiness = require('./businesses/gateway');
const RedisClient = require('./lib/redis_client');
const LogsBroadcasting = require('./lib/logs_broadcasting');

// Constants.
const CONFIG_PATH = process.env.CONFIG_PATH || '../config/gateway';
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_GATEWAY';

module.exports = (async () => {
  // Init config.
  const config = Multiconf.get(CONFIG_PATH, `${LIQUIO_CONFIG_PREFIX}_`);
  global.config = config;

  // Init redis.
  global.redisClient = global.config?.redis?.isEnabled ? new RedisClient(global.config.redis) : null;

  // Init log.
  const consoleLogProvider = new ConsoleLogProvider(config.log.console.name, { excludeParams: config.log.excludeParams });
  const log = new Log([consoleLogProvider], ['console']);
  global.log = log;

  // Log unhandled rejections.
  process.on('unhandledRejection', (error) => {
    const { stack, message } = error || {};
    log.save('unhandled-rejection', { stack, message });
    process.exit(1);
  });

  // Save moment global to use in eval.
  global.moment = moment;

  const db = await Db.getInstance(config.db);
  global.db = db;

  const gatewayBusiness = new GatewayBusiness();
  await gatewayBusiness.init();

  // Init message queue.
  const messageQueue = new MessageQueue(config.message_queue, {
    onInit: () => {
      messageQueue.subscribeToConsuming(gatewayBusiness.createFromMessage.bind(gatewayBusiness));
    }
  });

  await messageQueue.init();
  global.messageQueue = messageQueue;

  // Init router.
  const routerService = new RouterService(config);
  await routerService.init();

  // Init logs broadcasting.
  if (process.env.NODE_ENV !== 'prod' && global.config?.logs_broadcasting?.isEnabled) {
    LogsBroadcasting.start(global.config.logs_broadcasting);
  }

})();
