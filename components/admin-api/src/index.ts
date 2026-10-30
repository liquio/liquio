import fs from 'node:fs';

import Multiconf from 'multiconf';

import { assertNoPlaceholderSecrets, assertTaskTokenIsNotDefault, findPlaceholderSecretWarnings } from './lib/config_check';
import { bootstrap } from './bootstrap';
import { setAppContext } from './lib/context';

// Constants.
const CONFIG_PATH = process.env.CONFIG_PATH || '../config/admin-api';
const SECRET_PATH = process.env.SECRET_PATH;
const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_ADMIN_API';

async function main() {
  // Init config.
  const config: Record<string, any> = Multiconf.get(
    [CONFIG_PATH, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])],
    `${LIQUIO_CONFIG_PREFIX}_HANDLER_`,
  );
  if (config.server.token === '') {
    throw new Error("Token must'n be empty.");
  }
  const placeholderSecrets = assertNoPlaceholderSecrets(config);
  const placeholderSecretWarnings = findPlaceholderSecretWarnings(config);
  assertTaskTokenIsNotDefault(config);
  global.config = config;
  setAppContext({ config });

  await bootstrap(config, { placeholderSecrets, placeholderSecretWarnings });
}

main().catch((err) => {
  console.error('Error during initialization:', err);
  process.exit(1);
});
