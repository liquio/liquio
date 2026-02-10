import { Injectable } from '@nestjs/common';

import { LoggerService } from '../observability/logger.service';

// Use require() instead of ES6 import for CommonJS module
const Multiconf = require('multiconf');

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
      this.logger.error('configuration-error', {
        error: e.message,
        stack: e.stack,
      });
      throw new Error('Unable to load configuration');
    }
  }

  get(key: keyof Configuration): any {
    return this.config[key];
  }
}
