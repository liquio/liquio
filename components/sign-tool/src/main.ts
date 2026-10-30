import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { Configuration, ConfigurationService } from './configuration/configuration.service';
import { configureApp } from './app.setup';
import { loadHttpsOptions } from './common/tls';
import { LoggerService } from './observability/logger.service';
import { ObservabilityModule } from './observability/observability.module';

async function bootstrap() {
  const als = ObservabilityModule.getAlsInstance();

  const logger = new LoggerService(als);

  // Opt-in HTTPS (server.tls.enabled). Resolved before the app starts so unreadable cert files fail fast.
  const bootConfig = new ConfigurationService(logger).get('server') as Configuration['server'];
  const httpsOptions = loadHttpsOptions(bootConfig.tls);

  const app = await NestFactory.create(AppModule, { logger, ...(httpsOptions ? { httpsOptions } : {}) });

  const config = configureApp(app, logger, { requireClientCert: !!httpsOptions?.ca });

  logger.log(`Listening`, { host: config.host, port: config.port, tls: !!httpsOptions });
  await app.listen(config.port, config.host);
}
bootstrap();
