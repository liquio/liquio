import { bootstrap } from './bootstrap';
import { loadConfig } from './lib/config';

async function main() {
  const config = loadConfig();

  await bootstrap(config);
}

main();
