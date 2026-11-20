// Import.
import { Log } from '@liquio/back-core';

import { setAppContext } from './lib/context';
import { bootstrap } from './bootstrap';
import typeOf from './lib/type_of';
import { createConsoleLogProvider } from './lib/console_log_provider';
import { loadPersistLinkConfig } from './lib/config';

// Init.
const config = loadPersistLinkConfig();
const consoleLogProvider = createConsoleLogProvider(config.log);
const log = new Log([consoleLogProvider], ['console']);
setAppContext({ config, log, typeOf });

// Process title.
process.title = 'persist-link';

// Start async thread.
(async () => {
  await bootstrap(config);
})();
