import { Sandbox } from '@liquio/back-core';

import { setAppContext, getLog } from './lib/context';
import { Db } from './lib/db';
import { Log } from './lib/log';
import { buildSandboxConfig } from './lib/sandbox_config';
import { ConsoleLogProvider } from './lib/log/providers/console';
import { createGatewayMessageBus, recordHandlerFailure, DESTINATION_GATEWAY } from './lib/message_bus';
import { RouterService } from './services/router';
import { GatewayBusiness } from './businesses/gateway';
import { RedisClient } from './lib/redis_client';
import type { GatewayConfig } from './lib/config.types';

export async function bootstrap(config: GatewayConfig) {
  setAppContext({ config });

  // Init redis.
  const redisClient = config?.redis?.isEnabled ? new RedisClient(config.redis) : null;
  setAppContext({ redisClient });

  // Init log.
  const consoleLogProvider = new ConsoleLogProvider(config.log.console.name, {
    excludeParams: config.log.excludeParams,
    disableDefaultRedaction: config.log.disableDefaultRedaction,
  });
  const log = new Log([consoleLogProvider], ['console']);
  setAppContext({ log });

  // Init sandbox (shared by the whole process, see `Sandbox.getInstance()`).
  new Sandbox({ ...buildSandboxConfig(config.sandbox), getLog } as any);

  const db = await Db.getInstance(config.db);
  setAppContext({ db });

  const gatewayBusiness = new GatewayBusiness();
  await gatewayBusiness.init();

  // Init message bus.
  const messageBus = createGatewayMessageBus(config);
  await messageBus.subscribe(DESTINATION_GATEWAY, gatewayBusiness.createFromMessage.bind(gatewayBusiness), {
    concurrency: config.message_queue.maxHandlingMessages || 1,
    onFailure: recordHandlerFailure,
  });
  await messageBus.init();
  setAppContext({ messageBus });

  // Init router.
  const routerService = new RouterService(config);
  await routerService.init();

  return { log, gatewayBusiness, messageBus, routerService };
}
