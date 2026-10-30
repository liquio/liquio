import { Module } from '@nestjs/common';

import { ConfigurationService } from './configuration.service';
import { LoggerService } from '../observability/logger.service';

@Module({
  providers: [ConfigurationService, LoggerService],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
