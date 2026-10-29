import { Log, ConsoleLogProvider } from '@liquio/back-core';

import { Db } from './lib/db';
import { MessageQueue } from './lib/message_queue';
import { RouterService } from './services/router';
import { WorkflowBusiness } from './businesses/workflow';
import { RedisClient } from './lib/redis_client';

/**
 * Initializes globals and services of the manager.
 * @param config Configuration object.
 * @returns Initialized services.
 */
export async function bootstrap(config: Record<string, any>) {
  global.config = config;

  // Init redis.
  global.redisClient = global.config?.redis?.isEnabled ? new RedisClient(global.config.redis) : null;

  // Init log.
  const consoleLogProvider = new ConsoleLogProvider(config.log.console.name, {
    excludeParams: config.log.excludeParams,
    disableDefaultRedaction: config.log?.disableDefaultRedaction === true,
  } as any);
  const log = new Log([consoleLogProvider], ['console']);
  global.log = log;

  const db = await Db.getInstance(config.db);
  global.db = db;

  const workflowBusiness = new WorkflowBusiness();
  await workflowBusiness.init();

  // Init message queue.
  const messageQueue = new MessageQueue(config.message_queue, {
    onInit: () => {
      messageQueue.subscribeToConsuming(workflowBusiness.createFromMessage.bind(workflowBusiness));
    },
  });

  await messageQueue.init();
  global.messageQueue = messageQueue;

  // Init router.
  const routerService = new RouterService(config);
  await routerService.init();

  return { workflowBusiness, messageQueue, routerService };
}
