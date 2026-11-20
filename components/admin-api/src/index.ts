import { findPlaceholderSecrets, findPlaceholderSecretWarnings } from './lib/config_check';
import { loadAdminApiConfig } from './lib/config';
import { bootstrap } from './bootstrap';
import { setAppContext } from './lib/context';
import { registerShutdown } from './lib/shutdown';

async function main() {
  // Init config.
  const config = loadAdminApiConfig();
  const placeholderSecrets = findPlaceholderSecrets(config);
  const placeholderSecretWarnings = findPlaceholderSecretWarnings(config);
  setAppContext({ config });

  const { messageBus, routerService } = await bootstrap(config, { placeholderSecrets, placeholderSecretWarnings });
  registerShutdown({ routerService, messageBus });
}

main().catch((err) => {
  console.error('Error during initialization:', err);
  process.exit(1);
});
