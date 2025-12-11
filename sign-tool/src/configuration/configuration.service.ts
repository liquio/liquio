import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Multiconf = require('multiconf');

import { LoggerService } from '../observability/logger.service';

export const CONFIG_PATH = process.env.CONFIG_PATH || '../config/sign-tool';
export const LIQUIO_CONFIG_PREFIX =
  process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_SIGN_TOOL';

export interface Configuration {
  x509: {
    caCerts: string[];
  };
  server: {
    host: string;
    port: number;
    isSwaggerEnabled: boolean;
    acceptedBodySize: string;
  };
}

@Injectable()
export class ConfigurationService {
  private readonly config: Configuration;

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(ConfigurationService.name);
    try {
      this.config = Multiconf.get(CONFIG_PATH, `${LIQUIO_CONFIG_PREFIX}_`);
    } catch (e) {
      this.logger.error('configuration-error', { error: e.message });
      throw new Error('Unable to load configuration');
    }
  }

  get(key: keyof Configuration): any {
    return this.config[key];
  }
}
