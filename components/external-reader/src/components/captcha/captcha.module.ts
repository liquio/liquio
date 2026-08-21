import { Module } from '@nestjs/common';

import { ConfigurationModule } from '@components/configuration/configuration.module';

import { CaptchaController } from './captcha.controller';
import { CaptchaService } from './captcha.service';

@Module({
  imports: [ConfigurationModule],
  controllers: [CaptchaController],
  providers: [CaptchaService],
  exports: [],
})
export class CaptchaModule {}
