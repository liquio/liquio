import moment from 'moment';
import { PluginLoader } from '@liquio/plugin-sdk';
import { Log, ConsoleLogProvider, Sandbox } from '@liquio/back-core';

import { Db } from './lib/db';
import { PgPubSub } from './lib/pgpubsub';
import { PaymentService } from './services/payment';
import { MessageQueue } from './lib/message_queue';
import { RedisClient } from './lib/redis_client';
import { Models } from './models';
import { DictionaryModels as DictionariesModel } from './models/dictionaries';
import { DocumentFillerService } from './services/document_filler';
import { Businesses } from './businesses';
import { RouterService } from './services/router';
import { FileGeneratorService } from './services/file_generator';
import { StorageService } from './services/storage';
import { Commands } from './commands';
import * as Errors from './lib/errors';
import typeOf from './lib/type_of';
import { HttpClient } from './lib/http_client';
import { ExternalServicesStatusesDaemon } from './lib/external_services_statuses_daemon';
import { loadConfig } from './lib/config';
import { assertBasicAuthConfig, assertDownloadTokenConfig, assertTestAuthConfig, buildSandboxConfig } from './lib/config_validation';
import * as JSONPath from './lib/jsonpath';
import { Keywords } from './services/document_validator/keywords';
import { initIdApiClient } from './lib/id_api';
import { setAppContext, getModels, getConfig, getLog } from './lib/context';

const CONFIG_PATH = process.env.CONFIG_PATH || '../config/task';

// Constants.
const DEFAULT_OPTIONS = {
  processTitle: 'bpmn-task',
  configPath: CONFIG_PATH,
  customValidators: {},
  customRoutes: {},
  customDocumentFillers: [],
  customModels: [],
  customDictionaryModels: [],
  customFileGeneratorOptions: [],
  customStorageProvider: undefined,
};
const JEST_ENV = 'jest';
global.JEST_ENV = JEST_ENV;
setAppContext({ JEST_ENV });

/**
 * BPMN Task core.
 */
export class BpmnTaskCore {
  options: typeof DEFAULT_OPTIONS & Record<string, any>;
  commands: any;
  pgpubsub: any;
  models: any;
  routerService: any;
  db: any;
  prometheus: any;
  sandbox: Sandbox;

  /**
   * BPMN Task core constructor.
   * @param {object} [options] Options.
   * @param {string} [options.processTitle] Process title.
   * @param {string} [options.configPath] Config directory path as "./config".
   * @param {object} [options.customValidators] Custom validators as { someValidatorName: SomeValidatorClass, anotherValidatorName: AnotherValidatorClass }.
   * @param {object} [options.customRoutes] Custom routes as { 'GET /some_url': { middlewares: [{ name: 'someMiddleware', method: 'someMiddlewareMethod' }], controller: { name: 'someController', method: 'someControllerMethod' } } }.
   * @param {object[]} [options.customDocumentFillers] Custom document fillers.
   * @param {object[]} [options.customModels] Custom models.
   * @param {object[]} [options.customDictionaryModels] Custom dictionary models.
   * @param {object[]} [options.customFileGeneratorOptions] Custom file generator options.
   * @param {object} [options.customStorageProvider] Custom storage provider.
   */
  constructor(options: Record<string, any> = {}) {
    // Save options.
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.commands = new Commands();
  }

  /**
   * Core classes.
   */
  static get CoreClasses() {
    return {
      libs: { Log },
      services: { RouterService, DocumentFillerService, StorageService },
      models: { DictionaryModel: DictionariesModel.dictionaryBase },
      controllers: RouterService.ControllersList,
      businesses: Businesses.List,
      documentFillers: DocumentFillerService.FillersList,
    };
  }

  /**
   * Init.
   */
  async init(disableRouter = false) {
    // Define params.
    const {
      processTitle,
      configPath,
      customValidators,
      customRoutes,
      customDocumentFillers,
      customModels,
      customDictionaryModels,
      customFileGeneratorOptions,
      customStorageProvider,
    } = this.options;

    // Set process title.
    process.title = processTitle;

    // Init config.
    const config: any = loadConfig(configPath);

    setAppContext({ config });
    global.config = config;

    // Do not start with a publicly known default Basic token (or none in production).
    assertBasicAuthConfig(config);

    // Do not sign download tokens with a placeholder, empty or short secret.
    assertDownloadTokenConfig(config);

    // Do not let test_users tokens bypass auth in production.
    assertTestAuthConfig(config);

    this.sandbox = new Sandbox({ ...buildSandboxConfig(config.sandbox), getLog } as any);
    Keywords.init();

    // Init global http client.
    const httpClient = new HttpClient(config.http_client);
    setAppContext({ httpClient });
    global.httpClient = httpClient;

    // Init global custom error.
    Object.entries(Errors).forEach(([ErrorName, ErrorClass]) => {
      (global as any)[ErrorName] = ErrorClass;
    });

    // Init log.
    const consoleLogProvider = new ConsoleLogProvider(config.log.console.name, config.log);
    let log;
    if (process.env.NODE_ENV === JEST_ENV) {
      log = new Log([consoleLogProvider], []);
    } else {
      log = new Log([consoleLogProvider], ['console']);
    }
    setAppContext({ log, typeOf });
    global.log = log;
    global.typeOf = typeOf;

    // Init id-api client.
    initIdApiClient({ ...config.auth?.LiquioId, authRedirectUrl: config.auth?.authRedirectUrl });

    // Log unhandled rejections.
    process.on('unhandledRejection', (error: any) => {
      const { stack, message } = error || {};
      log.save('unhandled-rejection', { stack, message }, 'error');
      process.exit(1);
    });

    // Save moment global to use in eval.
    setAppContext({ moment });
    global.moment = moment;

    // Init DB.
    const db = await Db.getInstance(config.db);
    setAppContext({ db });
    global.db = db;

    // Init pgpubsub.
    const pgpubsub = new PgPubSub(config.db);
    await pgpubsub.connect();
    this.pgpubsub = pgpubsub;

    // Init document filler.
    new DocumentFillerService(customDocumentFillers);

    // Init models.
    this.models = new Models(customModels);
    setAppContext({ models: global.models });
    new DictionariesModel(customDictionaryModels);

    // Initialize sandbox.
    await this.sandbox.init(this.models);

    // Init plugins. `paymentTransactions` is the only capability a TaskPaymentProvider plugin
    // gets besides logging/config - it never touches the models/db globals directly (see
    // `TaskPaymentTransactionService`'s own JSDoc in `@liquio/plugin-sdk`).
    const pluginsConfig = config.plugins;
    let pluginRegistry;
    if (pluginsConfig) {
      const paymentTransactions = {
        create: (data) => getModels().paymentTransactions.create(data),
        resolve: async (id) => (await getModels().paymentTransactions.findById(id)) ?? undefined,
      };
      pluginRegistry = await new PluginLoader(log, undefined, { paymentTransactions }).load(pluginsConfig);
    } else {
      log.save('plugin-load-summary', { configured: 0, loaded: 0, plugins: [] });
    }

    // Pre-warm the PaymentService singleton with the plugin registry, so that when
    // businesses/document.ts later constructs it (via `new PaymentService(config.payment)`,
    // unaware of plugins), the singleton guard returns this already-plugin-aware instance.
    new PaymentService(config.payment, pluginRegistry);

    // Init businesses.
    const businesses: any = new Businesses(config);
    global.businesses = businesses.businesses;
    setAppContext({ businesses: businesses.businesses });

    // Init BPMN Task redis.
    const redisClient = config?.redis?.isEnabled
      ? new RedisClient({
          host: config.redis.host,
          port: config.redis.port,
          defaultTtl: config.redis.defaultTtl,
        })
      : undefined;
    setAppContext({ redisClient });
    global.redisClient = redisClient;

    // Init common BPMN redis.
    const redisClientCommonBpmn = config?.redis?.redisCommonBpmn?.isEnabled
      ? new RedisClient({
          host: config.redis.redisCommonBpmn.host,
          port: config.redis.redisCommonBpmn.port,
          defaultTtl: config.redis.redisCommonBpmn.defaultTtl,
        })
      : undefined;
    setAppContext({ redisClientCommonBpmn });
    global.redisClientCommonBpmn = redisClientCommonBpmn;

    const taskBusiness = businesses.businesses.task;
    const documentBusiness = businesses.businesses.document;

    // Init message queue.
    const messageQueue: any = new MessageQueue(config.message_queue, {
      onInit: () => {
        messageQueue.subscribeToConsuming(taskBusiness.createFromMessage.bind(taskBusiness));
        if (
          typeof config.message_queue.enabledReadingGeneratingPdfMessages === 'undefined' ||
          config.message_queue.enabledReadingGeneratingPdfMessages === true
        ) {
          messageQueue.subscribeToConsuming(
            documentBusiness.files.createPdfFromMessage.bind(documentBusiness.files),
            'readingPdf',
            'bpmn-task-incoming-generating-pdf',
          );
        }
        if (Object.keys(config.message_queue?.delayedAutoCommitQueues || {})?.length) {
          messageQueue.subscribeToConsuming(
            taskBusiness.delayedAutoCommitFromMessage.bind(taskBusiness),
            'delayedAutoCommit',
            `${config.message_queue.readingQueueName}-delayed-auto-commit`,
          );
        }
      },
    });

    await messageQueue.init();
    setAppContext({ messageQueue });
    global.messageQueue = messageQueue;

    // Init file generator.
    new FileGeneratorService(customFileGeneratorOptions);

    // Init storage service.
    new StorageService(customStorageProvider);

    // Start external service statuses daemon.
    if (getConfig().external_services?.daemon?.isEnbaled) {
      const externalServicesStatusesDaemon = new ExternalServicesStatusesDaemon(getConfig().external_services.daemon);
      externalServicesStatusesDaemon.start();
    }

    if (disableRouter) {
      return;
    }

    // Init router.
    this.routerService = new RouterService(config);
    await this.routerService.init({ customValidators, customRoutes });
  }

  async listen() {
    return this.routerService.listen();
  }

  async stop() {
    await this.routerService?.stop();
    await this.db?.close();
    await this.pgpubsub?.cleanup?.();
    await this.prometheus?.stop();
    JSONPath.cleanTimeouts();
  }
}

export async function bootstrap(): Promise<void> {
  // Init.
  const bpmnTaskCore = new BpmnTaskCore();
  await bpmnTaskCore.init();

  // Start.
  await bpmnTaskCore.listen();
}
