import { Module } from '@nestjs/common';

import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [],
})
export class ProvidersModule {}
