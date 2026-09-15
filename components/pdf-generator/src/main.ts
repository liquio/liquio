import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';

import { ServerConfig } from '@common/types/config.types';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { asyncLocalStorageMiddleware } from './lib/async-local-storage';
import { Config } from './lib/config';
import { log, nestLogger } from './lib/log';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: nestLogger });

  app.enableCors();
  const serverConfig = Config.get<ServerConfig>('server');
  app.use(json({ limit: serverConfig.bodyLimit || '50mb' }));
  app.use(asyncLocalStorageMiddleware);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(serverConfig.port, () => {
    log.save('server-listening-started', { port: serverConfig.port });
  });
}

bootstrap().catch((error) => {
  log.save('unhandled-error', { error });
});
