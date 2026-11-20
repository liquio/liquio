import { getLog } from './lib/context';
import { loadGatewayConfig } from './lib/config';
import { bootstrap } from './bootstrap';
import { registerShutdown } from './lib/shutdown';

module.exports = (async () => {
  // Init config.
  const config = loadGatewayConfig();

  // Log unhandled rejections.
  process.on('unhandledRejection', (error: any) => {
    const { stack, message } = error || {};
    getLog()?.save('unhandled-rejection', { stack, message });
    process.exit(1);
  });

  const { messageBus, routerService } = await bootstrap(config);
  registerShutdown({ routerService, messageBus });
})();
