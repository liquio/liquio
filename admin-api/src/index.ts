import fs from 'node:fs';

import Multiconf from 'multiconf';
import redis from 'redis';

import { Db } from './lib/db';
import { Log } from './lib/log';
import { ConsoleLogProvider } from './lib/log/providers/console';
import { MessageQueue } from './lib/message_queue';
import { RouterService } from './services/router';
import { Models } from './models';
import { WorkflowHandlerBusiness } from './businesses/workflow_handler';
import { ElasticBusiness } from './businesses/elastic';
import { WorkflowBusiness } from './businesses/workflow';
import { LogsBroadcasting } from './lib/logs_broadcasting';
import { HttpClient } from './lib/http_client';
import { typeOf } from './lib/type_of';

// Constants.
const CONFIG_PATH = process.env.CONFIG_PATH || '../config/admin-api';
const SECRET_PATH = process.env.SECRET_PATH;
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_ADMIN_API';

async function main() {
  // Init config.
  const config: Record<string, any> = Multiconf.get([CONFIG_PATH, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])], `${LIQUIO_CONFIG_PREFIX}_HANDLER_`);
  if (config.server.token === '') {
    throw new Error('Token must\'n be empty.');
  }
  global.config = config;

  // Init http client.
  global.httpClient = new HttpClient(config.http_client);
  global.typeOf = typeOf;

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
}

main().catch((err) => {
  console.error('Error during initialization:', err);
  process.exit(1);
});
