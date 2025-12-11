const moment = require('moment');

const Db = require('./lib/db');
const PgPubSub = require('./lib/pgpubsub');
const Log = require('./lib/log');
const ConsoleLogProvider = require('./lib/log/providers/console');
const MessageQueue = require('./lib/message_queue');
const RedisClient = require('./lib/redis_client');
const Models = require('./models');
const DictionariesModel = require('./models/dictionaries');
const DocumentFillerService = require('./services/document_filler');
const AuthService = require('./services/auth');
const Businesses = require('./businesses');
const RouterService = require('./services/router');
const FileGeneratorService = require('./services/file_generator');
const StorageService = require('./services/storage');
const LdapClient = require('./services/ldap');
const Commands = require('./commands');
const Errors = require('./lib/errors');
const LogsBroadcasting = require('./lib/logs_broadcasting');
const typeOf = require('./lib/type_of');
const HttpClient = require('./lib/http_client');
const ExternalServicesStatusesDaemon = require('./lib/external_services_statuses_daemon');
const { loadConfig } = require('./lib/config');
const JSONPath = require('./lib/jsonpath');

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
class BpmnTaskCore {
  /**
   * BPMN Task core constructor.
   * @param {object} [options] Options.
   * @param {string} [options.processTitle] Process title.
   * @param {string} [options.configPath] Config directory path as "./config".
   * @param {object} [options.customBusinesses] Custom businesses as { someBusinessName: SomeBusinessClass, anotherBusinessName: AnotherBusinessClass }.
   * @param {object} [options.customValidators] Custom validators as { someValidatorName: SomeValidatorClass, anotherValidatorName: AnotherValidatorClass }.
   * @param {object} [options.customRoutes] Custom routes as { 'GET /some_url': { middlewares: [{ name: 'someMiddleware', method: 'someMiddlewareMethod' }], controller: { name: 'someController', method: 'someControllerMethod' } } }.
   * @param {object[]} [options.customDocumentFillers] Custom document fillers.
   * @param {object} [options.customAuthProvider] Custom auth provider.
   * @param {object[]} [options.customModels] Custom models.
   * @param {object[]} [options.customDictionaryModels] Custom dictionary models.
   * @param {object[]} [options.customFileGeneratorOptions] Custom file generator options.
   * @param {object} [options.customStorageProvider] Custom storage provider.
   */
  constructor(options = {}) {
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
      customBusinesses,
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
    const config = loadConfig(configPath);

    // Init global http client.
    global.httpClient = new HttpClient(global.config.http_client);

    // Init global custom error.
    Object.entries(Errors).forEach(([ErrorName, ErrorClass]) => {
      global[ErrorName] = ErrorClass;
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
    process.on('unhandledRejection', (error) => {
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

    // Init document filler.
    new DocumentFillerService(customDocumentFillers);

    // Init models.
    this.models = new Models(customModels);
    new DictionariesModel(customDictionaryModels);

    // Init businesses.
    const businesses = new Businesses(config, customBusinesses);

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
    const messageQueue = new MessageQueue(config.message_queue, {
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
    await this.pgpubsub?.client?.end();
    await this.prometheus?.stop();
    JSONPath.cleanTimeouts();
  }
}

module.exports = BpmnTaskCore;
