import { Config, resolveEnvPrefix } from '@liquio/back-core';

import type { PersistLinkConfig } from './config.types';

export function loadPersistLinkConfig(): PersistLinkConfig {
  return Config.load<PersistLinkConfig>({
    defaultConfigPath: '../config/persist-link',
    envPrefix: resolveEnvPrefix('LIQUIO_CFG_PERSIST_LINK'),
  }).toObject();
}
