import { Injectable } from '@nestjs/common';
import { Config, ConfigValidationError, resolveEnvPrefix } from '@liquio/back-core';
import { z } from 'zod';

import { buildConfigurationSchema } from '@components/configuration/configuration.schema';
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
      this.config = Config.load<TConfig>({
        defaultConfigPath: './config',
        envPrefix: resolveEnvPrefix('LIQUIO_CFG_EXTERNAL_READER'),
        // The schema describes the base `Configuration`; TConfig only narrows it for consumers, so the cast is safe.
        schema: buildConfigurationSchema() as z.ZodType<TConfig>,
      }).toObject();
    } catch (error) {
      this.logger.error('configuration-error', {
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof ConfigValidationError) throw error;
      throw new Error('Unable to load configuration');
    }
  }

  get<K extends keyof TConfig>(key: K): TConfig[K] {
    return this.config[key];
  }
}
