import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import Multiconf from 'multiconf';

import { Configuration } from '@components/configuration/configuration.types';
import { LoggerService } from '@components/observability/logger.service';

@Injectable()
export class ConfigurationService<TConfig extends Configuration = Configuration> {
  private readonly config: TConfig;

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(ConfigurationService.name);
    try {
      const configPath = process.env.CONFIG_PATH || './config';
      const secretPath = process.env.SECRET_PATH;
      const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_EXTERNAL_READER';
      this.config = Multiconf.get(
        [configPath, ...(secretPath && existsSync(secretPath) ? [secretPath] : [])],
        `${LIQUIO_CONFIG_PREFIX}_`,
      ) as TConfig;
    } catch (error) {
      this.logger.error('configuration-error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Unable to load configuration');
    }
  }

  get<K extends keyof TConfig>(key: K): TConfig[K] {
    return this.config[key];
  }
}
