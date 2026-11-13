import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { createBodyParserMiddleware } from 'src/common/middlewares';
import { GlobalExceptionFilter } from 'src/common/filters';
import { AppModule } from 'src/app.module';
import { QueueFullException } from 'src/modules/pdf/adapters/playwright/cluster/cluster';
import { PDF_GENERATOR_TOKEN } from 'src/modules/pdf/interfaces/pdf-generator.interface';
import { TEST_AUTH_PASSWORD, TEST_AUTH_USERNAME } from './setup-env';

const token = `Basic ${Buffer.from(`${TEST_AUTH_USERNAME}:${TEST_AUTH_PASSWORD}`).toString('base64')}`;

describe('Body limits and queue overflow (e2e)', () => {
  let app: INestApplication;
  let generate: jest.Mock;

  beforeEach(async () => {
    generate = jest.fn().mockResolvedValue(Buffer.from('pdf'));
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PDF_GENERATOR_TOKEN)
      .useValue({ generateFromTemplate: generate })
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.use(createBodyParserMiddleware({ defaultLimit: '100kb', pdfLimit: '2mb', basicAuthTokens: [token] }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const html = (bytes: number) => ({ html: `<p>${'a'.repeat(bytes)}</p>` });

  it('rejects a 1 MB body without a token with 401, without invoking the generator', async () => {
    await request(app.getHttpServer())
      .post('/pdf')
      .send(html(1024 * 1024))
      .expect(401);
    expect(generate).not.toHaveBeenCalled();
  });

  it('rejects a 1 MB body with a wrong token with 401', async () => {
    await request(app.getHttpServer())
      .post('/pdf')
      .auth(TEST_AUTH_USERNAME, 'wrong')
      .send(html(1024 * 1024))
      .expect(401);
  });

  it('accepts an authenticated body above the default limit but within bodyLimit', async () => {
    await request(app.getHttpServer())
      .post('/pdf')
      .auth(TEST_AUTH_USERNAME, TEST_AUTH_PASSWORD)
      .send(html(1024 * 1024))
      .expect(201);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('rejects an authenticated body above bodyLimit with 413', async () => {
    await request(app.getHttpServer())
      .post('/pdf')
      .auth(TEST_AUTH_USERNAME, TEST_AUTH_PASSWORD)
      .send(html(3 * 1024 * 1024))
      .expect(413);
  });

  it('applies the small default limit to other routes', async () => {
    await request(app.getHttpServer())
      .post('/test/ping')
      .auth(TEST_AUTH_USERNAME, TEST_AUTH_PASSWORD)
      .send(html(200 * 1024))
      .expect(413);
  });

  it('answers 429 with Retry-After when the queue is full', async () => {
    generate.mockRejectedValue(new QueueFullException());

    await request(app.getHttpServer())
      .post('/pdf')
      .auth(TEST_AUTH_USERNAME, TEST_AUTH_PASSWORD)
      .send(html(10))
      .expect(429)
      .expect('Retry-After', '5');
  });
});
