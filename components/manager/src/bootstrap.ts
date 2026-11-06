import { Log, ConsoleLogProvider } from '@liquio/back-core';

import { Db } from './lib/db';
import { MessageQueue } from './lib/message_queue';
import { RouterService } from './services/router';
import { WorkflowBusiness } from './businesses/workflow';
import { RedisClient } from './lib/redis_client';
import { setAppContext, getConfig } from './lib/context';

/**
 * Initializes globals and services of the manager.
 * @param config Configuration object.
 * @returns Initialized services.
 */
export async function bootstrap(config: Record<string, any>) {
  setAppContext({ config });

  // Init redis.
  setAppContext({ redisClient: getConfig()?.redis?.isEnabled ? new RedisClient(getConfig().redis) : null });

  // Init log.
  const consoleLogProvider = new ConsoleLogProvider(config.log.console.name, {
    excludeParams: config.log.excludeParams,
    disableDefaultRedaction: config.log?.disableDefaultRedaction === true,
  } as any);
  const log = new Log([consoleLogProvider], ['console']);
  setAppContext({ log });

  const db = await Db.getInstance(config.db);
  setAppContext({ db });

  const workflowBusiness = new WorkflowBusiness();
  await workflowBusiness.init();

  // Init message queue.
  const messageQueue = new MessageQueue(config.message_queue, {
    onInit: () => {
      messageQueue.subscribeToConsuming(workflowBusiness.createFromMessage.bind(workflowBusiness));
    },
  });

  await messageQueue.init();
  setAppContext({ messageQueue });

  // Init router.
  const routerService = new RouterService(config);
  await routerService.init();

  return { workflowBusiness, messageQueue, routerService };
}
