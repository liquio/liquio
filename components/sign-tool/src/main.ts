import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';

import { AppModule } from './app.module';
import {
  Configuration,
  ConfigurationService,
} from './configuration/configuration.service';
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

  const app = await NestFactory.create(AppModule, { logger });

  const config: Configuration['server'] = app
    .get(ConfigurationService)
    .get('server');

  if (config.isSwaggerEnabled) {
    useSwagger(app);
  }

  // Set the payload size limit
  if (config.acceptedBodySize) {
    app.use(bodyParser.json({ limit: config.acceptedBodySize }));
    app.use(
      bodyParser.urlencoded({ limit: config.acceptedBodySize, extended: true }),
    );
  }

  app.useGlobalInterceptors(new LoggingInterceptor(logger));
  app.useGlobalInterceptors(new ErrorsInterceptor(logger));

  logger.log(`Listening`, { host: config.host, port: config.port });
  await app.listen(config.port, config.host);
}
bootstrap();
