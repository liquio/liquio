import fs from 'node:fs';

import moment from 'moment';
import Multiconf from 'multiconf';

import { Db } from './lib/db';
import { Log } from './lib/log';
import { ConsoleLogProvider } from './lib/log/providers/console';
import { MessageQueue } from './lib/message_queue';
import { RouterService } from './services/router';
import { GatewayBusiness } from './businesses/gateway';
import { RedisClient } from './lib/redis_client';
import { LogsBroadcasting } from './lib/logs_broadcasting';

// Constants.
const CONFIG_PATH = process.env.CONFIG_PATH || '../config/gateway';
const SECRET_PATH = process.env.SECRET_PATH;
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_GATEWAY';

module.exports = (async () => {
  // Init config.
  const config: Record<string, any> = Multiconf.get(
    [CONFIG_PATH, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])],
    `${LIQUIO_CONFIG_PREFIX}_`,
  );
  global.config = config;

  // Init redis.
  global.redisClient = global.config?.redis?.isEnabled ? new RedisClient(global.config.redis) : null;

  // Init log.
  const consoleLogProvider = new ConsoleLogProvider(config.log.console.name, { excludeParams: config.log.excludeParams });
  const log = new Log([consoleLogProvider], ['console']);
  global.log = log;

  // Log unhandled rejections.
  process.on('unhandledRejection', (error: any) => {
    const { stack, message } = error || {};
    log.save('unhandled-rejection', { stack, message });
    process.exit(1);
  });

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

  // Init logs broadcasting.
  if (process.env.NODE_ENV !== 'prod' && global.config?.logs_broadcasting?.isEnabled) {
    LogsBroadcasting.start(global.config.logs_broadcasting);
  }
})();
