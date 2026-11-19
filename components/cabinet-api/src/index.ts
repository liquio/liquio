import { bootstrap } from './bootstrap';
import { loadCabinetApiConfig } from './lib/config';

// Start async thread.
async function main(): Promise<void> {
  // Init config.
  const config = loadCabinetApiConfig();

  await bootstrap(config);
}

main();
