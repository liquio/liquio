import moment from 'moment';

import { Db } from './lib/db';
import { Log, ConsoleLogProvider, getTraceId } from '@liquio/back-core';
import { PluginLoader } from '@liquio/plugin-sdk';
import { MessageQueue } from './lib/message_queue';
import * as Errors from './lib/errors';
import { Models } from './models';
import RouterService from './services/router';
import EventService from './services/event';
import ExternalServiceRequester from './services/event/requester/external_service';
import EventBusiness from './businesses/event';
import { RedisClient } from './lib/redis_client';
import { HttpClient } from './lib/http_client';
import { LogsBroadcasting } from './lib/logs_broadcasting';
import { Sandbox } from './lib/sandbox';
import { typeOf } from './lib/type_of';

// Allow not secure connections.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export class App {
  config: any;
  sandbox: any;
  typeOf: any;
  log: any;
  httpClient: any;
  redisClient: any;
  db: any;
  models: any;
  pluginRegistry: any;
  eventService: any;
  eventBusiness: any;
  messageQueue: any;
  routerService: any;

  constructor(config: any) {
    this.config = config;
    this.sandbox = new Sandbox(config.sandbox);
    // Set global config for models and other legacy code that still uses it
    global.config = config;
  }

  // Init global custom error.
  useGlobalErrors() {
    Object.entries(Errors).forEach(([ErrorName, ErrorClass]) => {
      (global as any)[ErrorName] = ErrorClass;
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
    process.on('unhandledRejection', (error: any) => {
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

  // Init plugins.
  async usePlugins() {
    const pluginsConfig = this.config.plugins;
    this.pluginRegistry = pluginsConfig ? await new PluginLoader(this.log).load(pluginsConfig) : undefined;

    // Pre-init the external service requester singleton with the plugin registry, so that
    // when EventRequester constructs it (without knowledge of plugins) it reuses this instance.
    new ExternalServiceRequester(this.config.requester?.externalService, this.config.requester?.registers, this.pluginRegistry);
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
    } as any);
  }

  // Init event business.
  useEventBusiness() {
    this.eventBusiness = new (EventBusiness as any)();

    // If enabled run daemon mode in config/app.json file.
    if (global.config.app.enabledRunDaemonMode) {
      // Run event daemon.
      // Note: this is an async method with an infinite loop inside.
      this.eventBusiness.runDaemon();
    }
  }

  // Init message queue.
  async useMessageQueue() {
    let messageQueue: any;

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

    // TODO: inject, do not set global.
    global.messageQueue = messageQueue;
  }

  // Init router.
  async useRouter() {
    const routerService = new RouterService(global.config);

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
