const Multiconf = require('multiconf');
const redis = require('redis');

const Db = require('./lib/db');
const Log = require('./lib/log');
const ConsoleLogProvider = require('./lib/log/providers/console');
const MessageQueue = require('./lib/message_queue');
const RouterService = require('./services/router');
const Models = require('./models');
const WorkflowHandlerBusiness = require('./businesses/workflow_handler');
const ElasticBusiness = require('./businesses/elastic');
const WorkflowBusiness = require('./businesses/workflow');
const Errors = require('./lib/errors');
const LogsBroadcasting = require('./lib/logs_broadcasting');
const HttpClient = require('./lib/http_client');
const typeOf = require('./lib/type_of');

// Constants.
const CONFIG_PATH = process.env.CONFIG_PATH || '../config/admin-api';
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_ADMIN_API';

module.exports = (async () => {
  // Init config.
  const config = Multiconf.get(CONFIG_PATH, `${LIQUIO_CONFIG_PREFIX}_HANDLER_`);
  if (config.server.token === '') {
    throw new Error('Token must\'n be empty.');
  }
  global.config = config;

  // Init http client.
  global.httpClient = new HttpClient(config.http_client);
  global.typeOf = typeOf;

  // Init global custom error.
  Errors.export();

  // Init log.
  const consoleLogProvider = new ConsoleLogProvider(config.log.console.name, { excludeParams: config.log.excludeParams });
  const log = new Log([consoleLogProvider], ['console']);
  global.log = log;

  global.db = await Db.getInstance(config.db);
  global.models = new Models().getModels();

  if (config.db.slave) {
    global.slaveDb = await Db.getInstance(config.db.slave, true);
    global.slaveModels = new Models({}, global.slaveDb).getModels();
  }

  if (config?.redis?.isEnabled) {
    const client = redis.createClient({
      socket: { host: config.redis.host, port: config.redis.port },
    });
    await client.connect();
    global.redis = client;
  }

  new WorkflowHandlerBusiness();

  // Updating elastic search template.
  const elasticBusiness = new ElasticBusiness(config);
  const { isSearchTemplateUpdated, templateName, reason } = await elasticBusiness.updateSearchTemplate();
  if (isSearchTemplateUpdated) {
    log.save('elastic-search-template-successfully-updated', { templateName });
  } else {
    log.save('elastic-search-template-didn\'t-update', { templateName, reason });
  }

  // Init message queue.
  const messageQueue = new MessageQueue(config.message_queue);
  await messageQueue.init();
  global.messageQueue = messageQueue;

  // Init router.
  const routerService = new RouterService(config);
  await routerService.init();

  if (process.env.NODE_ENV !== 'prod' && global.config.logs_broadcasting?.isEnabled) {
    const logsBroadcasting = new LogsBroadcasting(global.config);
    logsBroadcasting.start();
  }

  global.businesses = {
    workflow: new WorkflowBusiness(),
  };
})();
