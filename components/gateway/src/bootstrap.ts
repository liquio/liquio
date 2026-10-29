import moment from 'moment';
import { Sandbox } from '@liquio/back-core';

import { Db } from './lib/db';
import { Log } from './lib/log';
import { buildSandboxConfig } from './lib/sandbox_config';
import { ConsoleLogProvider } from './lib/log/providers/console';
import { MessageQueue } from './lib/message_queue';
import { RouterService } from './services/router';
import { GatewayBusiness } from './businesses/gateway';
import { RedisClient } from './lib/redis_client';

export async function bootstrap(config: Record<string, any>) {
  global.config = config;

  // Init redis.
  global.redisClient = global.config?.redis?.isEnabled ? new RedisClient(global.config.redis) : null;

  // Init log.
  const consoleLogProvider = new ConsoleLogProvider(config.log.console.name, {
    excludeParams: config.log.excludeParams,
    disableDefaultRedaction: config.log.disableDefaultRedaction,
  });
  const log = new Log([consoleLogProvider], ['console']);
  global.log = log;

  // Init sandbox (shared by the whole process, see `Sandbox.getInstance()`).
  new Sandbox(buildSandboxConfig(config.sandbox) as any);

  // Save moment global to use in eval.
  global.moment = moment;

  const db = await Db.getInstance(config.db);
  global.db = db;

  const gatewayBusiness = new GatewayBusiness();
  await gatewayBusiness.init();

  // Init message queue.
  const messageQueue = new MessageQueue(config.message_queue, {
    onInit: () => {
      messageQueue.subscribeToConsuming(gatewayBusiness.createFromMessage.bind(gatewayBusiness));
    },
  });

  await messageQueue.init();
  global.messageQueue = messageQueue;

  // Init router.
  const routerService = new RouterService(config);
  await routerService.init();

  return { log, gatewayBusiness, messageQueue, routerService };
}
