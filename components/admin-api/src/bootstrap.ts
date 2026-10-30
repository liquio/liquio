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
  setAppContext({ config });

  // Init http client.
  setAppContext({ httpClient: new HttpClient(config.http_client), typeOf });

  // Init log.
  const consoleLogProvider = new ConsoleLogProvider(config.log.console.name, {
    excludeParams: config.log.excludeParams,
    disableDefaultRedaction: config.log.disableDefaultRedaction === true,
  });
  const log = new Log([consoleLogProvider], ['console']);
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

  const db = await Db.getInstance(config.db);
  setAppContext({ db });
  setAppContext({ models: new Models().getModels() });

  if (config.db.slave) {
    const slaveDb = await Db.getInstance(config.db.slave, true);
    setAppContext({ slaveDb, slaveModels: new Models({}, slaveDb).getModels() });
  }

  if (config?.redis?.isEnabled) {
    const client = new RedisClient({ host: config.redis.host, port: config.redis.port });
    await client.connect();
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
  setAppContext({ messageQueue });

  // Init router.
  const routerService = new RouterService(config);
  await routerService.init();

  setAppContext({ businesses: { workflow: new WorkflowBusiness() } });

  return { messageQueue, routerService, elasticBusiness };
}
