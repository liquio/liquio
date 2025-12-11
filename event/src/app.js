const moment = require('moment');

const Db = require('./lib/db');
const Log = require('./lib/log');
const ConsoleLogProvider = require('./lib/log/providers/console');
const MessageQueue = require('./lib/message_queue');
const Errors = require('./lib/errors');
const Models = require('./models');
const RouterService = require('./services/router');
const EventService = require('./services/event');
const EventBusiness = require('./businesses/event');
const RedisClient = require('./lib/redis_client');
const HttpClient = require('./lib/http_client');
const LogsBroadcasting = require('./lib/logs_broadcasting');
const Sandbox = require('./lib/sandbox');
const typeOf = require('./lib/type_of');
const { getTraceId } = require('./lib/async_local_storage');

// Allow not secure connections.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

class App {
  constructor(config) {
    this.config = config;
    this.sandbox = new Sandbox(config.sandbox);
    // Set global config for models and other legacy code that still uses it
    global.config = config;
  }

  // Init global custom error.
  useGlobalErrors() {
    Object.entries(Errors).forEach(([ErrorName, ErrorClass]) => {
      global[ErrorName] = ErrorClass;
    });
  }

  // Init global typeOf.
  useGlobalTypeOf() {
    this.typeOf = typeOf;
  }

  // Init log.
  useLog() {
    const consoleName = (this.config.log.console && typeof this.config.log.console === 'object' && this.config.log.console.name) 
      ? this.config.log.console.name 
      : 'console';
    const consoleLogProvider = new ConsoleLogProvider(consoleName, { excludeParams: this.config.log.excludeParams });
    this.log = global.log = new Log([consoleLogProvider], ['console']);
  }

  // Init http client.
  useHttpClient() {
    this.httpClient = new HttpClient(this.config.http_client, this.log.save.bind(this.log), getTraceId);
  }

  // Log unhandled rejections.
  useUnhandedRejectionLogging() {
    process.on('unhandledRejection', (error) => {
      const { stack, message } = error || {};
      this.log.save('unhandled-rejection', { stack, message });
      process.exit(1);
    });
  }

  // Import moment globally to use in eval.
  useMoment() {
    global.moment = moment;
  }

  // Init redis.
  useRedis() {
    this.redisClient = this.config.redis && this.config.redis.enabled ? new RedisClient() : null;
  }

  // Init DB.
  async useDb() {
    this.db = await Db.getInstance(this.config.db);
    global.db = this.db;
  }

  // Init models.
  useModels() {
    this.models = new Models();
  }

  // Init event service.
  useEventService() {
    this.eventService = new EventService({
      notifier: this.config.notifier,
      delayer: this.config.delayer,
      requester: this.config.requester,
      stopper: this.config.stopper,
      unit: this.config.unit,
      user: this.config.user,
      filestorage: this.config.filestorage,
    });
  }

  // Init event business.
  useEventBusiness() {
    this.eventBusiness = new EventBusiness();

    // If enabled run daemon mode in config/app.json file.
    if (config.app.enabledRunDaemonMode) {
      // Run event daemon.
      // Note: this is an async method with an infinite loop inside.
      this.eventBusiness.runDaemon();
    }
  }

  // Init message queue.
  async useMessageQueue() {
    let messageQueue;

    if (!this.eventBusiness) {
      throw new Error('Event business is not initialized');
    }

    // If enabled read message queue mode in config/app.json file.
    if (!this.config.app.enabledReadMessageQueueMode && this.config.app.enabledRunDaemonMode) {
      // Init message queue.
      messageQueue = new MessageQueue(this.config.message_queue, {
        onInit: () => {},
      });
    } else {
      // Init message queue.
      messageQueue = new MessageQueue(this.config.message_queue, {
        onInit: () => {
          messageQueue.subscribeToConsuming(this.eventBusiness.createFromMessage.bind(this.eventBusiness));
        },
      });
    }

    await messageQueue.init();
    this.messageQueue = messageQueue;
  }

  // Init router.
  async useRouter() {
    const routerService = new RouterService(config);

    // Note: there is an open async handle created inside.
    await routerService.init();

    this.routerService = routerService;
  }

  // Init logs broadcasting.
  useLogsBroadcasting() {
    if (process.env.NODE_ENV !== 'prod' && this.config?.logs_broadcasting?.isEnabled) {
      LogsBroadcasting.start(this.config.logs_broadcasting);
    }
  }
}

module.exports = App;
