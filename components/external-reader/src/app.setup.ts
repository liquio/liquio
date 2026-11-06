import { INestApplication, ValidationPipe } from '@nestjs/common';

import { GlobalExceptionFilter } from '@common/filters/global-exception.filter';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { assertAuthConfig } from '@components/auth/auth-config';
import { ConfigurationService } from '@components/configuration/configuration.service';
import { Configuration } from '@components/configuration/configuration.types';
import { ErrorsInterceptor } from '@components/observability/errors.interceptor';
import { LoggerService } from '@components/observability/logger.service';
import { LoggingInterceptor } from '@components/observability/logging.interceptor';
import { useSwagger } from './swagger';

export function configureApp(app: INestApplication, logger: LoggerService): Configuration['server'] {
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
  return appConfig;
}
