import { Module } from '@nestjs/common';

import { X509Controller } from './x509.controller';
import { X509Service } from './x509.service';
import { ConfigurationModule } from '../configuration/configuration.module';
import { ObservabilityModule } from '../observability/observability.module';

@Module({
  imports: [ConfigurationModule, ObservabilityModule],
  providers: [X509Service],
  controllers: [X509Controller],
})
export class X509Module {}
