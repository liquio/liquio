import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from 'src/app.module';
import { TEST_AUTH_PASSWORD, TEST_AUTH_USERNAME } from './setup-env';

describe('Basic auth (e2e)', () => {
  let app: INestApplication;
  const originalAuth = process.env.KITSOFT_PDF_GENERATOR_auth;

  afterEach(async () => {
    process.env.KITSOFT_PDF_GENERATOR_auth = originalAuth;
    await app?.close();
    app = undefined as unknown as INestApplication;
  });

  const createApp = async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  };

  it('returns 401 without credentials', async () => {
    await createApp();
    await request(app.getHttpServer()).post('/pdf').send({ html: '<p>x</p>' }).expect(401);
  });

  it('returns 401 for a wrong password', async () => {
    await createApp();
    await request(app.getHttpServer()).post('/pdf').auth(TEST_AUTH_USERNAME, 'wrong').send({ html: '<p>x</p>' }).expect(401);
  });

  it('returns 401 for the former default credentials', async () => {
    await createApp();
    await request(app.getHttpServer()).post('/pdf').auth('username', 'password').send({ html: '<p>x</p>' }).expect(401);
  });

  it('keeps the public ping route open', async () => {
    await createApp();
    await request(app.getHttpServer()).get('/test/ping').expect(200);
  });

  it('refuses to start without configured tokens', async () => {
    process.env.KITSOFT_PDF_GENERATOR_auth = JSON.stringify({ basicAuthTokens: [] });
    await expect(createApp()).rejects.toThrow('at least one token');
  });

  it('refuses to start with the default token', async () => {
    process.env.KITSOFT_PDF_GENERATOR_auth = JSON.stringify({ basicAuthTokens: ['Basic dXNlcm5hbWU6cGFzc3dvcmQ='] });
    await expect(createApp()).rejects.toThrow('publicly known default');
  });

  it('accepts the configured credentials', async () => {
    await createApp();
    await request(app.getHttpServer()).get('/test/ping').auth(TEST_AUTH_USERNAME, TEST_AUTH_PASSWORD).expect(200);
  });
});
