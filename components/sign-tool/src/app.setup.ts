import { INestApplication } from '@nestjs/common';

import { Configuration, ConfigurationService } from './configuration/configuration.service';
import { applyBodyLimit } from './common/body-limit';
import { requireClientCert } from './common/tls';
import { LoggingInterceptor } from './observability/logging.interceptor';
import { LoggerService } from './observability/logger.service';
import { ErrorsInterceptor } from './observability/errors.interceptor';
import { useSwagger } from './swagger';

export function configureApp(app: INestApplication, logger: LoggerService, opts: { requireClientCert?: boolean } = {}): Configuration['server'] {
  const config: Configuration['server'] = app.get(ConfigurationService).get('server');

  if (opts.requireClientCert) {
    app.use(requireClientCert());
  }

  if (config.isSwaggerEnabled) {
    useSwagger(app);
  }

  // Set the payload size limit (falls back to a safe default when not configured)
  applyBodyLimit(app, config.acceptedBodySize);

  app.useGlobalInterceptors(new LoggingInterceptor(logger));
  app.useGlobalInterceptors(new ErrorsInterceptor(logger));

  return config;
}
