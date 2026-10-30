import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { nestLogger } from 'src/lib/log';
import { TEST_AUTH_PASSWORD, TEST_AUTH_USERNAME } from '../setup-env';

/**
 * Creates the application with the production pipeline. `playwright` overrides keys of the playwright config
 * for the lifetime of the app creation (the adapter reads the config in its constructor).
 */
export async function createApp(playwright: Record<string, unknown> = {}): Promise<INestApplication> {
  const original = process.env.KITSOFT_PDF_GENERATOR_playwright;
  process.env.KITSOFT_PDF_GENERATOR_playwright = JSON.stringify({ ...JSON.parse(original as string), ...playwright });

  try {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleFixture.createNestApplication({ logger: nestLogger, bodyParser: false });
    configureApp(app);
    await app.init();
    return app;
  } finally {
    process.env.KITSOFT_PDF_GENERATOR_playwright = original;
  }
}

export function postPdf(app: INestApplication, body: unknown) {
  return request(app.getHttpServer())
    .post('/pdf')
    .auth(TEST_AUTH_USERNAME, TEST_AUTH_PASSWORD)
    .send(body as object);
}
