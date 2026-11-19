import { bootstrap } from './bootstrap';
import { loadManagerConfig } from './lib/config';
import { getLog } from './lib/context';
import { registerShutdown } from './lib/shutdown';

// Set proxess title.
process.title = 'bpmn-manager';

module.exports = (async () => {
  // Init config.
  const config = loadManagerConfig();

  // Log unhandled rejections.
  process.on('unhandledRejection', (error: any) => {
    const { stack, message } = error || {};
    getLog().save('unhandled-rejection', { stack, message });
    process.exit(1);
  });

  const { workflowBusiness, messageBus, routerService } = await bootstrap(config);

  // Reload BPMN schemas with interval.
  // TODO: Change later next reloading interval.
  const reloadInterval = setInterval(() => {
    workflowBusiness.init();
  }, config.cache.reloadBpmnSchemasInterval);

  registerShutdown({ routerService, messageBus, reloadInterval });
})();
