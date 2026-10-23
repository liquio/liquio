import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { createBodyParserMiddleware } from '@common/middlewares';
import { AuthConfig, ServerConfig } from '@common/types/config.types';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { asyncLocalStorageMiddleware } from './lib/async-local-storage';
import { assertValidBasicAuthTokens } from '@modules/auth/auth-tokens';
import { Config } from './lib/config';
import { log, nestLogger } from './lib/log';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: nestLogger, bodyParser: false });

  app.enableCors();
  const serverConfig = Config.get<ServerConfig>('server');
  const basicAuthTokens = Config.get<AuthConfig | undefined>('auth')?.basicAuthTokens;
  assertValidBasicAuthTokens(basicAuthTokens);
  app.use(
    createBodyParserMiddleware({
      defaultLimit: serverConfig.defaultBodyLimit,
      pdfLimit: serverConfig.bodyLimit,
      basicAuthTokens,
    }),
  );
  app.use(asyncLocalStorageMiddleware);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(serverConfig.port, () => {
    log.save('server-listening-started', { port: serverConfig.port });
  });
}

bootstrap().catch((error) => {
  log.save('unhandled-error', { error });
  process.exit(1);
});
