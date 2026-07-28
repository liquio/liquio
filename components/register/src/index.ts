import Log from './lib/log';
import ConsoleLogProvider from './lib/log/providers/console';
import Db from './lib/db';
import Afterhandler from './lib/afterhandler';
import ErrorWithDetails from './lib/errors';
import typeOf from './lib/typeOf';
import Models from './models';
import Router from './router';
import Encryption from './lib/encryption';
import { config } from './lib/config';
import { RedisClient } from './lib/redis_client';
import { PgPubSub } from './lib/pgpubsub';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Init.
const consoleLogProvider = new ConsoleLogProvider('console', { excludeParams: config.log.excludeParams });
const log = new Log([consoleLogProvider as any]);

// Globals for legacy JS code: do not use in new code.
global.config = config;
global.log = log;
global.ErrorWithDetails = ErrorWithDetails;
global.typeOf = typeOf;

// Log unhandled rejections.
process.on('unhandledRejection', (error: Error | undefined) => {
  const { stack, message } = error || {};
  log.save('unhandled-rejection', { stack, message }, 'error');
  process.exit(1);
});

// Set proxess title
process.title = config.app.processTitle;

// Start async thread.
async function main() {
  // Init Redis.
  if (config.redis && config.redis.isEnabled) {
    const redisClient = new RedisClient({
      host: config.redis.host,
      port: config.redis.port
    });
    try {
      await redisClient.connect();
    } catch (error) {
      log.save('redis-connect-error', { error: error?.message }, 'error');
      process.exit(1);
    }
  }

  // Init DB.
  global.db = await Db.getInstance(config.db);

  // Init pgpubsub.
  const pgpubsub = new PgPubSub(config.db);
  await pgpubsub.connect();

  // Init models.
  const models = new Models(config);
  models.init();

  // Init afterhandler.
  const afterhandler = new Afterhandler(config.afterhandler, models.models.afterhandler as any, models.models.record as any);
  afterhandler.init();
  global.afterhandler = afterhandler;

  global.encryption = new Encryption(config.encryption);

  // Start server.
  const router = new Router(config);
  await router.init();
}

main();
