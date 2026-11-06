import moment from 'moment';
import { Log, ConsoleLogProvider, getTraceId, Sandbox } from '@liquio/back-core';
import { PluginLoader } from '@liquio/plugin-sdk';

import { Db } from './lib/db';
import { MessageQueue } from './lib/message_queue';
import { Models } from './models';
import { RouterService } from './services/router';
import { EventService } from './services/event';
import { ExternalServiceRequester } from './services/event/requester/external_service';
import { EventBusiness } from './businesses/event';
import { RedisClient } from './lib/redis_client';
import { HttpClient } from './lib/http_client';
import { typeOf } from './lib/type_of';
import { initIdApiClient } from './lib/id_api';
import { installTlsOverrides } from './lib/tls';
import { buildSandboxConfig } from './lib/sandbox_config';
import { setAppContext, getLog, getConfig } from './lib/context';

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
    setAppContext({ config });
    this.sandbox = new Sandbox({ ...buildSandboxConfig(config.sandbox), getLog } as any);
  }

  // Init global typeOf.
  useGlobalTypeOf() {
    this.typeOf = typeOf;
    setAppContext({ typeOf });
  }

  // Init log.
  useLog() {
    const consoleName =
      this.config.log.console && typeof this.config.log.console === 'object' && this.config.log.console.name
        ? this.config.log.console.name
        : 'console';
    const consoleLogProvider = new ConsoleLogProvider(consoleName, {
      excludeParams: this.config.log.excludeParams,
      disableDefaultRedaction: this.config.log?.disableDefaultRedaction === true,
    } as any);
    this.log = new Log([consoleLogProvider], ['console']);
    setAppContext({ log: this.log });
  }

  // Init id-api client.
  useIdApiClient() {
    initIdApiClient(this.config.user?.LiquioId);
  }

  // Init http client.
  useHttpClient() {
    // TLS verification stays on by default. Exceptions (self-signed endpoints) are opt-in per endpoint.
    const { filestorage, http_client: httpClientConfig } = this.config;
    installTlsOverrides(
      [{ url: filestorage?.apiHost, allowInsecureTls: filestorage?.allowInsecureTls, ca: filestorage?.ca }, ...(httpClientConfig?.tls || [])],
      (message: string) => this.log.save('tls-warning', { message }, 'warn'),
    );
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
    setAppContext({ moment });
  }

  // Init redis.
  useRedis() {
    this.redisClient = this.config.redis && this.config.redis.enabled ? new RedisClient() : null;
  }

  // Init DB.
  async useDb() {
    this.db = await Db.getInstance(this.config.db);
    setAppContext({ db: this.db });
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
    this.eventBusiness = new EventBusiness();

    // If enabled run daemon mode in config/app.json file.
    if (getConfig().app.enabledRunDaemonMode) {
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

    setAppContext({ messageQueue });
  }

  // Init router.
  async useRouter() {
    const routerService = new RouterService(getConfig());

    // Note: there is an open async handle created inside.
    await routerService.init();

    this.routerService = routerService;
  }
}

export async function bootstrap(config: any) {
  const app = new App(config);
  app.useGlobalTypeOf();
  app.useLog();
  app.useIdApiClient();
  app.useHttpClient();
  app.useUnhandedRejectionLogging();
  app.useMoment();
  app.useRedis();
  await app.useDb();
  app.useModels();
  await app.usePlugins();
  app.useEventService();
  app.useEventBusiness();
  await app.useMessageQueue();
  await app.useRouter();
}
