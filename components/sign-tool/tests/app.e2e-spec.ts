import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { applyBodyLimit } from '../src/common/body-limit';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyBodyLimit(app, '1kb');
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('pong');
  });

  it('rejects bodies over the configured limit with 413', async () => {
    await request(app.getHttpServer())
      .post('/x509/signature-info')
      .send({ signature: 'a'.repeat(5000) })
      .expect(413);
  });

  it('does not reject small bodies with 413', async () => {
    const res = await request(app.getHttpServer()).post('/x509/signature-info').send({ signature: 'a' });
    expect(res.status).not.toBe(413);
  });
});
