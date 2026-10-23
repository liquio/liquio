import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { Configuration, ConfigurationService } from './configuration/configuration.service';
import { applyBodyLimit } from './common/body-limit';
import { loadHttpsOptions, requireClientCert } from './common/tls';
import { LoggingInterceptor } from './observability/logging.interceptor';
import { LoggerService } from './observability/logger.service';
import { ObservabilityModule } from './observability/observability.module';
import { ErrorsInterceptor } from './observability/errors.interceptor';

function useSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Sign Tool')
    .setDescription('A crypto toolkit for signing and verifying messages')
    .setVersion('1.0')
    .addTag('IIT')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
}

async function bootstrap() {
  const als = ObservabilityModule.getAlsInstance();

  const logger = new LoggerService(als);

  // Opt-in HTTPS (server.tls.enabled). Resolved before the app starts so unreadable cert files fail fast.
  const bootConfig = new ConfigurationService(logger).get('server') as Configuration['server'];
  const httpsOptions = loadHttpsOptions(bootConfig.tls);

  const app = await NestFactory.create(AppModule, { logger, ...(httpsOptions ? { httpsOptions } : {}) });

  const config: Configuration['server'] = app.get(ConfigurationService).get('server');

  if (httpsOptions?.ca) {
    app.use(requireClientCert());
  }

  if (config.isSwaggerEnabled) {
    useSwagger(app);
  }

  // Set the payload size limit (falls back to a safe default when not configured)
  applyBodyLimit(app, config.acceptedBodySize);

  app.useGlobalInterceptors(new LoggingInterceptor(logger));
  app.useGlobalInterceptors(new ErrorsInterceptor(logger));

  logger.log(`Listening`, { host: config.host, port: config.port, tls: !!httpsOptions });
  await app.listen(config.port, config.host);
}
bootstrap();
