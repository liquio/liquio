import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { BasicAuthGuard } from '@common/guards';
import { AuthModule } from '@components/auth/auth.module';
import { CaptchaModule } from '@components/captcha/captcha.module';
import { ConfigurationModule } from '@components/configuration/configuration.module';
import { ObservabilityModule } from '@components/observability/observability.module';
import { PingModule } from '@components/ping/ping.module';
import { ProvidersModule } from '@components/providers/providers.module';

@Module({
  imports: [
    AuthModule,
    PingModule,
    ConfigurationModule,
    ObservabilityModule,
    CaptchaModule,
    ProvidersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: BasicAuthGuard,
    },
  ],
})
export class AppModule {}
