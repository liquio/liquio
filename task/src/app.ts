import moment from 'moment';

import Db from './lib/db';
import PgPubSub from './lib/pgpubsub';
import Log from './lib/log';
import ConsoleLogProvider from './lib/log/providers/console';
import MessageQueue from './lib/message_queue';
import RedisClient from './lib/redis_client';
import Models from './models';
import DictionariesModel from './models/dictionaries';
import DocumentFillerService from './services/document_filler';
import AuthService from './services/auth';
import Businesses from './businesses';
import RouterService from './services/router';
import FileGeneratorService from './services/file_generator';
import StorageService from './services/storage';
import LdapClient from './services/ldap';
import Commands from './commands';
import Errors from './lib/errors';
import LogsBroadcasting from './lib/logs_broadcasting';
import typeOf from './lib/type_of';
import HttpClient from './lib/http_client';
import ExternalServicesStatusesDaemon from './lib/external_services_statuses_daemon';
import { loadConfig } from './lib/config';
import JSONPath from './lib/jsonpath';

const CONFIG_PATH = process.env.CONFIG_PATH || '../config/task';

// Constants.
const DEFAULT_OPTIONS = {
  processTitle: 'bpmn-task',
  configPath: CONFIG_PATH,
  customValidators: {},
  customRoutes: {},
  customDocumentFillers: [],
  customAuthProvider: undefined,
  customModels: [],
  customDictionaryModels: [],
  customFileGeneratorOptions: [],
  customStorageProvider: undefined,
};
const JEST_ENV = 'jest';
global.JEST_ENV = JEST_ENV;

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

  /**
   * BPMN Task core constructor.
   * @param {object} [options] Options.
   * @param {string} [options.processTitle] Process title.
   * @param {string} [options.configPath] Config directory path as "./config".
   * @param {object} [options.customValidators] Custom validators as { someValidatorName: SomeValidatorClass, anotherValidatorName: AnotherValidatorClass }.
   * @param {object} [options.customRoutes] Custom routes as { 'GET /some_url': { middlewares: [{ name: 'someMiddleware', method: 'someMiddlewareMethod' }], controller: { name: 'someController', method: 'someControllerMethod' } } }.
   * @param {object[]} [options.customDocumentFillers] Custom document fillers.
   * @param {object} [options.customAuthProvider] Custom auth provider.
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
      services: { RouterService, DocumentFillerService, AuthService, StorageService },
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
      customAuthProvider,
      customModels,
      customDictionaryModels,
      customFileGeneratorOptions,
      customStorageProvider,
    } = this.options;

    // Set process title.
    process.title = processTitle;

    // Init config.
    const config: any = loadConfig(configPath);

    // Init global http client.
    global.httpClient = new HttpClient(global.config.http_client);

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
    global.log = log;
    global.typeOf = typeOf;

    // Log unhandled rejections.
    process.on('unhandledRejection', (error: any) => {
      const { stack, message } = error || {};
      log.save('unhandled-rejection', { stack, message }, 'error');
      process.exit(1);
    });

    // Save moment global to use in eval.
    global.moment = moment;

    // Init DB.
    const db = await Db.getInstance(config.db);
    global.db = db;

    // Init pgpubsub.
    const pgpubsub = new PgPubSub(config.db);
    await pgpubsub.connect();
    this.pgpubsub = pgpubsub;

    // Init document filler.
    new DocumentFillerService(customDocumentFillers);

    // Init models.
    this.models = new Models(customModels);
    new DictionariesModel(customDictionaryModels);

    // Init businesses.
    const businesses: any = new Businesses(config);

    // Init BPMN Task redis.
    global.redisClient = config?.redis?.isEnabled
      ? new RedisClient({
        host: config.redis.host,
        port: config.redis.port,
        defaultTtl: config.redis.defaultTtl,
      })
      : undefined;

    // Init common BPMN redis.
    global.redisClientCommonBpmn = config?.redis?.redisCommonBpmn?.isEnabled
      ? new RedisClient({
        host: config.redis.redisCommonBpmn.host,
        port: config.redis.redisCommonBpmn.port,
        defaultTtl: config.redis.redisCommonBpmn.defaultTtl,
      })
      : undefined;

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
            documentBusiness.createPdfFromMessage.bind(documentBusiness),
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
    global.messageQueue = messageQueue;

    // Init file generator.
    new FileGeneratorService(customFileGeneratorOptions);

    // Init storage service.
    new StorageService(customStorageProvider);

    // Start external service statuses daemon.
    if (global.config.external_services?.daemon?.isEnbaled) {
      const externalServicesStatusesDaemon = new ExternalServicesStatusesDaemon(global.config.external_services.daemon);
      externalServicesStatusesDaemon.start();
    }

    // Init auth.
    new AuthService(customAuthProvider);

    if (disableRouter) {
      return;
    }

    // Init router.
    this.routerService = new RouterService(config);
    await this.routerService.init({ customValidators, customRoutes });

    if (global.config?.auth?.ldap?.isEnabled) {
      await LdapClient.initialize(global.config.auth.ldap);
    }

    // Init logs broadcasting.
    if (process.env.NODE_ENV !== 'prod' && global.config?.logs_broadcasting?.isEnabled) {
      LogsBroadcasting.start(global.config.logs_broadcasting);
    }
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
