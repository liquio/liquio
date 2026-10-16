import { Log, ConsoleLogProvider, Sandbox } from '@liquio/back-core';

import Db from './lib/db';
import Afterhandler from './lib/afterhandler';
import ErrorWithDetails from './lib/errors';
import typeOf from './lib/typeOf';
import Models from './models';
import Router from './router';
import Encryption from './lib/encryption';
import { config } from './lib/config';
import { listUnrestrictedUsers } from './lib/service_permissions';
import { assertSafeConfig, assertEncryptionConfig, warnPlainHttpSign, warnEmptySignToken } from './lib/config_guard';
import { RedisClient } from './lib/redis_client';
import { PgPubSub } from './lib/pgpubsub';
import { buildSandboxConfig } from './lib/sandbox_config';

// Init.
const consoleLogProvider = new ConsoleLogProvider('console', { excludeParams: config.log.excludeParams });
const log = new Log([consoleLogProvider as any], ['console']);

// Globals for legacy JS code: do not use in new code.
global.config = config;
global.log = log;
global.ErrorWithDetails = ErrorWithDetails;
global.typeOf = typeOf;

// Refuse to start with placeholder/empty credentials (messages name settings only, never values).
try {
  assertSafeConfig(config);
} catch (error) {
  log.save('config-guard-error', { error: error?.message }, 'error');
  process.exit(1);
}

warnPlainHttpSign(config);
warnEmptySignToken(config);

// Basic users without a permission entry have full access (opt-in hardening, `auth.servicePermissions`).
const unrestrictedUsers = listUnrestrictedUsers(config.auth);
if (unrestrictedUsers.length > 0) {
  log.save('auth-unrestricted-users', { users: unrestrictedUsers, hint: 'Set auth.servicePermissions to restrict them.' }, 'warn');
}

// Init sandbox (shared by the whole process, see `Sandbox.getInstance()`).
new Sandbox(buildSandboxConfig(config.sandbox) as any);

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
      port: config.redis.port,
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

  // Never generate or replace a key: only refuse an unusable one when encrypted keys exist.
  try {
    const [encrypted] = await global.db.query('SELECT 1 FROM keys WHERE is_encrypted = true LIMIT 1', { type: 'SELECT' });
    assertEncryptionConfig(config, !!encrypted);
  } catch (error) {
    log.save('config-guard-error', { error: error?.message }, 'error');
    process.exit(1);
  }

  global.encryption = new Encryption(config.encryption);

  // Start server.
  const router = new Router(config);
  await router.init();
}

main();
