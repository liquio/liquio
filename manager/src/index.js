const Multiconf = require('multiconf');

const Db = require('./lib/db');
const Log = require('./lib/log');
const ConsoleLogProvider = require('./lib/log/providers/console');
const MessageQueue = require('./lib/message_queue');
const RouterService = require('./services/router');
const WorkflowBusiness = require('./businesses/workflow');
const RedisClient = require('./lib/redis_client');

// Constants.
const CONFIG_PATH = process.env.CONFIG_PATH || '../config/manager';
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_MANAGER';

// Set proxess title.
process.title = 'bpmn-manager';

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

  const db = await Db.getInstance(config.db);
  global.db = db;

  const workflowBusiness = new WorkflowBusiness();
  await workflowBusiness.init();

  // Reload BPMN schemas with interval.
  // TODO: Change later next reloading interval.
  setInterval(() => {
    workflowBusiness.init();
  }, config.cache.reloadBpmnSchemasInterval);

  // Init message queue.
  const messageQueue = new MessageQueue(config.message_queue, {
    onInit: () => {
      messageQueue.subscribeToConsuming(workflowBusiness.createFromMessage.bind(workflowBusiness));
    },
  });

  await messageQueue.init();
  global.messageQueue = messageQueue;

  // Init router.
  const routerService = new RouterService(config);
  await routerService.init();
})();
