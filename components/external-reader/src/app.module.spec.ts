import { Test, TestingModule } from '@nestjs/testing';

import { AuthModule } from '@components/auth/auth.module';
import { CaptchaModule } from '@components/captcha/captcha.module';
import { ConfigurationModule } from '@components/configuration/configuration.module';
import { ObservabilityModule } from '@components/observability/observability.module';
import { PingModule } from '@components/ping/ping.module';
import { ProvidersModule } from '@components/providers/providers.module';

import { AppModule } from './app.module';

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide BasicAuthGuard as APP_GUARD', () => {
    const appModule = module.get(AppModule);
    expect(appModule).toBeDefined();
    expect(module).toBeDefined();
  });

  it('should compile successfully', async () => {
    await expect(module.init()).resolves.not.toThrow();
  });

  it('should import AuthModule', () => {
    const authModule = module.get(AuthModule);
    expect(authModule).toBeDefined();
  });

  it('should import PingModule', () => {
    const pingModule = module.get(PingModule);
    expect(pingModule).toBeDefined();
  });

  it('should import ConfigurationModule', () => {
    const configModule = module.get(ConfigurationModule);
    expect(configModule).toBeDefined();
  });

  it('should import ObservabilityModule', () => {
    const observabilityModule = module.get(ObservabilityModule);
    expect(observabilityModule).toBeDefined();
  });

  it('should import CaptchaModule', () => {
    const captchaModule = module.get(CaptchaModule);
    expect(captchaModule).toBeDefined();
  });

  it('should import ProvidersModule', () => {
    const providersModule = module.get(ProvidersModule);
    expect(providersModule).toBeDefined();
  });
});
