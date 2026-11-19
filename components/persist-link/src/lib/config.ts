import { Config, resolveEnvPrefix } from '@liquio/back-core';

export function loadPersistLinkConfig(): Record<string, any> {
  return Config.load({
    defaultConfigPath: '../config/persist-link',
    envPrefix: resolveEnvPrefix('LIQUIO_CFG_PERSIST_LINK'),
  }).toObject();
}
