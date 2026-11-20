import { NestFactory } from '@nestjs/core';

import { LoggerService } from '@components/observability/logger.service';
import { ObservabilityModule } from '@components/observability/observability.module';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const als = ObservabilityModule.getAlsInstance();
  const logger = new LoggerService(als);

  const app = await NestFactory.create(AppModule, { logger });

  const { port } = configureApp(app, logger);

  await app.listen(port, () => {
    logger.log('server-listening-started', { port });
  });
}

bootstrap().catch((error) => {
  console.error('unhandled-error', { error });
  process.exit(1);
});
