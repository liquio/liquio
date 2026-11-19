import fs from 'node:fs';

import Multiconf from 'multiconf';

import { getLog } from './lib/context';
import { bootstrap } from './bootstrap';
import { registerShutdown } from './lib/shutdown';

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

  // Log unhandled rejections.
  process.on('unhandledRejection', (error: any) => {
    const { stack, message } = error || {};
    getLog()?.save('unhandled-rejection', { stack, message });
    process.exit(1);
  });

  const { messageBus, routerService } = await bootstrap(config);
  registerShutdown({ routerService, messageBus });
})();
