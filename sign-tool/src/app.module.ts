import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigurationModule } from './configuration/configuration.module';
import { HealthcheckModule } from './healthcheck/healthcheck.module';
import { ObservabilityModule } from './observability/observability.module';
import { X509Module } from './x509/x509.module';

@Module({
  imports: [
    ObservabilityModule,
    ConfigurationModule,
    HealthcheckModule,
    ScheduleModule.forRoot(),
    X509Module,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
