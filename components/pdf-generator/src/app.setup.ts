import { INestApplication, ValidationPipe } from '@nestjs/common';

import { createBodyParserMiddleware } from '@common/middlewares';
import { AuthConfig, ServerConfig } from '@common/types/config.types';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { asyncLocalStorageMiddleware } from './lib/async-local-storage';
import { assertValidBasicAuthTokens } from '@modules/auth/auth-tokens';
import { Config } from './lib/config';

/**
 * Applies the production HTTP pipeline (CORS, body parsers, trace id, validation, exception filter) to the app.
 * The app must be created with `bodyParser: false`.
 * @param {INestApplication} app - Nest application.
 * @returns {ServerConfig} Server config.
 */
export function configureApp(app: INestApplication): ServerConfig {
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

  return serverConfig;
}
