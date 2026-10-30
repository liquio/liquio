import { Log, ConsoleLogProvider, Sandbox } from '@liquio/back-core';

import { Db } from './lib/db';
import { RedisClient } from './lib/redis_client';
import { MessageQueue } from './lib/message_queue';
import { RouterService } from './services/router';
import { Models } from './models';
import { WorkflowHandlerBusiness } from './businesses/workflow_handler';
import { ElasticBusiness } from './businesses/elastic';
import { WorkflowBusiness } from './businesses/workflow';
import { HttpClient } from './lib/http_client';
import { typeOf } from './lib/type_of';
import { initIdApiClient } from './lib/id_api';
import { warnPlainHttpInternalUrls } from './lib/internal_transport';
import { buildSandboxConfig } from './lib/sandbox_config';
import { setAppContext, getLog } from './lib/context';

/**
 * Initializes globals and services of the admin-api.
 * @param config Configuration object.
 * @param options Startup config check results to log.
 * @returns Initialized services.
 */
export async function bootstrap(config: Record<string, any>, options: { placeholderSecrets?: string[]; placeholderSecretWarnings?: string[] } = {}) {
  const { placeholderSecrets = [], placeholderSecretWarnings = [] } = options;
  global.config = config;
  setAppContext({ config });

  // Init http client.
  global.httpClient = new HttpClient(config.http_client);
  global.typeOf = typeOf;
  setAppContext({ httpClient: global.httpClient, typeOf });

  // Init log.
  const consoleLogProvider = new ConsoleLogProvider(config.log.console.name, {
    excludeParams: config.log.excludeParams,
    disableDefaultRedaction: config.log.disableDefaultRedaction === true,
  });
  const log = new Log([consoleLogProvider], ['console']);
  global.log = log;
  setAppContext({ log });
  warnPlainHttpInternalUrls(config);
  if (placeholderSecrets.length > 0) {
    getLog().save('config-placeholder-secrets-in-dev', { paths: placeholderSecrets });
  }
  if (placeholderSecretWarnings.length > 0) {
    getLog().save('config-placeholder-secrets-warning', { paths: placeholderSecretWarnings });
  }

  // Init id-api client (shared by the whole process, see `getIdApiClient()`).
  initIdApiClient(config.auth);

  // Init sandbox (shared by the whole process, see `Sandbox.getInstance()`).
  new Sandbox({ ...buildSandboxConfig(config.sandbox), getLog } as any);

  global.db = await Db.getInstance(config.db);
  global.models = new Models().getModels();
  setAppContext({ db: global.db, models: global.models });

  if (config.db.slave) {
    global.slaveDb = await Db.getInstance(config.db.slave, true);
    global.slaveModels = new Models({}, global.slaveDb).getModels();
    setAppContext({ slaveDb: global.slaveDb, slaveModels: global.slaveModels });
  }

  if (config?.redis?.isEnabled) {
    const client = new RedisClient({ host: config.redis.host, port: config.redis.port });
    await client.connect();
    global.redis = client;
    setAppContext({ redis: client });
  }

  new WorkflowHandlerBusiness();

  // Updating elastic search template.
  const elasticBusiness = new ElasticBusiness(config);
  const { isSearchTemplateUpdated, templateName, reason } = await elasticBusiness.updateSearchTemplate();
  if (isSearchTemplateUpdated) {
    getLog().save('elastic-search-template-successfully-updated', { templateName });
  } else {
    getLog().save("elastic-search-template-didn't-update", { templateName, reason });
  }

  // Init message queue.
  const messageQueue = new MessageQueue(config.message_queue);
  await messageQueue.init();
  global.messageQueue = messageQueue;
  setAppContext({ messageQueue });

  // Init router.
  const routerService = new RouterService(config);
  await routerService.init();

  global.businesses = {
    workflow: new WorkflowBusiness(),
  };
  setAppContext({ businesses: global.businesses });

  return { messageQueue, routerService, elasticBusiness };
}
