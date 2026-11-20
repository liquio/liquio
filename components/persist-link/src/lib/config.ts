import { Config, resolveEnvPrefix } from '@liquio/back-core';

import { persistLinkConfigSchema } from './config.schema';
import type { PersistLinkConfig } from './config.types';

export function loadPersistLinkConfig(): PersistLinkConfig {
  return Config.load<PersistLinkConfig>({
    defaultConfigPath: '../config/persist-link',
    envPrefix: resolveEnvPrefix('LIQUIO_CFG_PERSIST_LINK'),
    schema: persistLinkConfigSchema,
  }).toObject();
}
