import { Config, resolveEnvPrefix } from '@liquio/back-core';

export function loadCabinetApiConfig(): Record<string, any> {
  return Config.load({ defaultConfigPath: '../config/cabinet-api', envPrefix: resolveEnvPrefix('LIQUIO_CFG_CABINET') }).toObject();
}
