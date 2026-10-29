// Import.
import { Sandbox } from '@liquio/back-core';

import { getLog, setAppContext } from './lib/context';
import Db from './lib/db';
import Models from './models';
import Router from './router';

export interface BootstrapOverrides {
  sandboxIsolationLevel?: string;
}

/**
 * Initializes the sandbox, DB, models and HTTP server. Expects the app context (config, log, typeOf) to be set.
 * @param config Application config.
 * @param overrides Test-only overrides.
 * @returns Started router.
 */
export async function bootstrap(config: any, overrides: BootstrapOverrides = {}): Promise<Router> {
  // Init sandbox (shared by the whole process, see `Sandbox.getInstance()`).
  // Template jsonMap code must never run outside isolated-vm, so production always uses isolated-vm.
  new Sandbox({ ...config.sandbox, isolationLevel: (overrides.sandboxIsolationLevel || 'isolated-vm') as any, getLog });

  // Init DB.
  const db = await Db.getInstance(config.db);
  setAppContext({ db });

  // Init models.
  const models = new Models(config);
  models.initModels();

  // Start server.
  const router = new Router(config);
  await router.init();
  return router;
}
