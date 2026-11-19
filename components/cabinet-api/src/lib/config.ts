import { Config, resolveEnvPrefix } from '@liquio/back-core';

import type { CabinetApiConfig } from './config.types';

export function loadCabinetApiConfig(): CabinetApiConfig {
  return Config.load<CabinetApiConfig>({ defaultConfigPath: '../config/cabinet-api', envPrefix: resolveEnvPrefix('LIQUIO_CFG_CABINET') }).toObject();
}
