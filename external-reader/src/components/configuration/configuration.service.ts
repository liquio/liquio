import { Injectable } from '@nestjs/common';
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
      const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_EXTERNAL_READER';
      this.config = Multiconf.get(configPath, `${LIQUIO_CONFIG_PREFIX}_`);
    } catch (error) {
      this.logger.error('configuration-error', { error: error.message });
      throw new Error('Unable to load configuration');
    }
  }

  get<K extends keyof TConfig>(key: K): TConfig[K] {
    return this.config[key];
  }
}
