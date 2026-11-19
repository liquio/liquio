import { assertNoPlaceholderSecrets, assertTaskTokenIsNotDefault, findPlaceholderSecretWarnings } from './lib/config_check';
import { loadAdminApiConfig } from './lib/config';
import { bootstrap } from './bootstrap';
import { setAppContext } from './lib/context';
import { registerShutdown } from './lib/shutdown';

async function main() {
  // Init config.
  const config = loadAdminApiConfig();
  if (config.server.token === '') {
    throw new Error("Token must'n be empty.");
  }
  const placeholderSecrets = assertNoPlaceholderSecrets(config);
  const placeholderSecretWarnings = findPlaceholderSecretWarnings(config);
  assertTaskTokenIsNotDefault(config);
  setAppContext({ config });

  const { messageBus, routerService } = await bootstrap(config, { placeholderSecrets, placeholderSecretWarnings });
  registerShutdown({ routerService, messageBus });
}

main().catch((err) => {
  console.error('Error during initialization:', err);
  process.exit(1);
});
