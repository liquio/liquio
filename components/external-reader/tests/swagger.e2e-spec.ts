import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from 'src/app.module';
import { useSwagger } from 'src/swagger';

describe('Swagger UI (e2e)', () => {
  let app: INestApplication;

  const createApp = async (isSwaggerEnabled?: boolean) => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    useSwagger(app, isSwaggerEnabled);
    await app.init();
  };

  afterEach(async () => {
    await app?.close();
  });

  it('GET /api is 404 by default', async () => {
    await createApp();
    await request(app.getHttpServer()).get('/api').expect(404);
  });

  it('GET /api is 404 when disabled', async () => {
    await createApp(false);
    await request(app.getHttpServer()).get('/api').expect(404);
    await request(app.getHttpServer()).get('/api-json').expect(404);
  });

  it('GET /api serves Swagger UI when enabled', async () => {
    await createApp(true);
    await request(app.getHttpServer()).get('/api').expect(200);
  });
});
