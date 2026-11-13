import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { description, name, version } from '../package.json';

/**
 * Serves Swagger UI at /api only when explicitly enabled (`isSwaggerEnabled: true` in config/server.json).
 * @param {INestApplication} app - Nest application.
 * @param {boolean} isEnabled - Config flag, off by default.
 */
export function useSwagger(app: INestApplication, isEnabled?: boolean): void {
  if (isEnabled !== true) {
    return;
  }

  const config = new DocumentBuilder().setTitle(name).setDescription(description).setVersion(version).build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
}
