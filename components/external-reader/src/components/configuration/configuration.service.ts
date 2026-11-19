import { Injectable } from '@nestjs/common';
import { Config, resolveEnvPrefix } from '@liquio/back-core';

import { Configuration } from '@components/configuration/configuration.types';
import { LoggerService } from '@components/observability/logger.service';

@Injectable()
export class ConfigurationService<TConfig extends Configuration = Configuration> {
  // The loader keys each config file's parsed contents by its filename
  // (e.g. `plugins.json`/`plugins.json.default` -> `config.get('plugins')`),
  // so any `<name>.json(.default)` file in the config dir is available as `config.get('<name>')`.
  private readonly config: TConfig;

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(ConfigurationService.name);
    try {
      this.config = Config.load<TConfig>({ defaultConfigPath: './config', envPrefix: resolveEnvPrefix('LIQUIO_CFG_EXTERNAL_READER') }).toObject();
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
