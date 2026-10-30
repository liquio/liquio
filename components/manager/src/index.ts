import fs from 'node:fs';

import Multiconf from 'multiconf';

import { bootstrap } from './bootstrap';
import { getLog } from './lib/context';

// Constants.
const CONFIG_PATH = process.env.CONFIG_PATH || '../config/manager';
const SECRET_PATH = process.env.SECRET_PATH;
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_MANAGER';

// Set proxess title.
process.title = 'bpmn-manager';

module.exports = (async () => {
  // Init config.
  const config: Record<string, any> = Multiconf.get(
    [CONFIG_PATH, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])],
    `${LIQUIO_CONFIG_PREFIX}_`,
  );

  // Log unhandled rejections.
  process.on('unhandledRejection', (error: any) => {
    const { stack, message } = error || {};
    getLog().save('unhandled-rejection', { stack, message });
    process.exit(1);
  });

  const { workflowBusiness } = await bootstrap(config);

  // Reload BPMN schemas with interval.
  // TODO: Change later next reloading interval.
  setInterval(() => {
    workflowBusiness.init();
  }, config.cache.reloadBpmnSchemasInterval);
})();
