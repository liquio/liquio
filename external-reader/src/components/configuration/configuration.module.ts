import { Global, Module } from '@nestjs/common';

import { ConfigurationService } from '@components/configuration/configuration.service';

@Global()
@Module({
  providers: [ConfigurationService],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
