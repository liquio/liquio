import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { GlobalExceptionFilter } from '@common/filters/global-exception.filter';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { assertAuthConfig } from '@components/auth/auth-config';
import { ConfigurationService } from '@components/configuration/configuration.service';
import { Configuration } from '@components/configuration/configuration.types';
import { ErrorsInterceptor } from '@components/observability/errors.interceptor';
import { LoggerService } from '@components/observability/logger.service';
import { LoggingInterceptor } from '@components/observability/logging.interceptor';
import { ObservabilityModule } from '@components/observability/observability.module';
import { AppModule } from './app.module';
import { useSwagger } from './swagger';

async function bootstrap() {
  const als = ObservabilityModule.getAlsInstance();
  const logger = new LoggerService(als);

  const app = await NestFactory.create(AppModule, { logger });

  const configService = app.get(ConfigurationService);
  assertAuthConfig(configService.get('auth'));

  const appConfig: Configuration['server'] = configService.get('server');

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(logger));
  app.useGlobalInterceptors(new ErrorsInterceptor(logger));
  app.useGlobalInterceptors(new TransformInterceptor());

  useSwagger(app, appConfig.isSwaggerEnabled);

  const { port } = appConfig;

  await app.listen(port, () => {
    logger.log('server-listening-started', { port });
  });
}

bootstrap().catch((error) => {
  console.error('unhandled-error', { error });
  process.exit(1);
});
