import { Injectable } from '@nestjs/common';
import { Config } from '@liquio/back-core';

import { LoggerService } from '../observability/logger.service';

export const CONFIG_PATH = process.env.CONFIG_PATH || '../../config/sign-tool';
export const SECRET_PATH = process.env.SECRET_PATH;
export const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_SIGN_TOOL';

export interface Configuration {
  x509: {
    caCerts: string[];
  };
  server: {
    host: string;
    port: number;
    isSwaggerEnabled: boolean;
    acceptedBodySize: string;
    tls?: {
      enabled?: boolean;
      certPath?: string;
      keyPath?: string;
      caPath?: string;
    };
  };
}

@Injectable()
export class ConfigurationService {
  private readonly config: Configuration;

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(ConfigurationService.name);
    try {
      this.config = Config.load<Configuration>({
        configPath: CONFIG_PATH,
        secretPath: SECRET_PATH ?? null,
        envPrefix: `${LIQUIO_CONFIG_PREFIX}_`,
      }).toObject();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.error('configuration-error', {
        error: err.message,
        stack: err.stack,
      });
      throw new Error('Unable to load configuration');
    }
  }

  get(key: keyof Configuration): any {
    return this.config[key];
  }
}
