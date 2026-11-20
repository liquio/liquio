import { Config, resolveEnvPrefix } from '@liquio/back-core';

import { cabinetApiConfigSchema } from './config.schema';
import type { CabinetApiConfig } from './config.types';

export function loadCabinetApiConfig(): CabinetApiConfig {
  return Config.load<CabinetApiConfig>({
    defaultConfigPath: '../config/cabinet-api',
    envPrefix: resolveEnvPrefix('LIQUIO_CFG_CABINET'),
    schema: cabinetApiConfigSchema,
  }).toObject();
}
