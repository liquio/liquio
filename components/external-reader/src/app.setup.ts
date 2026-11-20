import { INestApplication, ValidationPipe } from '@nestjs/common';

import { GlobalExceptionFilter } from '@common/filters/global-exception.filter';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { ConfigurationService } from '@components/configuration/configuration.service';
import { ExternalReaderConfig } from '@components/configuration/configuration.types';
import { ErrorsInterceptor } from '@components/observability/errors.interceptor';
import { LoggerService } from '@components/observability/logger.service';
import { LoggingInterceptor } from '@components/observability/logging.interceptor';
import { useSwagger } from './swagger';

export function configureApp(app: INestApplication, logger: LoggerService): ExternalReaderConfig['server'] {
  const configService = app.get(ConfigurationService);
  const appConfig: ExternalReaderConfig['server'] = configService.get('server');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(logger));
  app.useGlobalInterceptors(new ErrorsInterceptor(logger));
  app.useGlobalInterceptors(new TransformInterceptor());
  useSwagger(app, appConfig.isSwaggerEnabled);
  return appConfig;
}
