import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createApp, postPdf } from './helpers/app';
import { captureLogs } from './helpers/log-capture';

const bigHtml = (bytes: number) => ({ html: `<p>${'a'.repeat(bytes)}</p>` });

describe('Production pipeline (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('echoes the x-trace-id header', async () => {
    const res = await request(app.getHttpServer()).get('/test/ping').set('x-trace-id', 'e2e-trace-1');
    expect(res.headers['x-trace-id']).toBe('e2e-trace-1');
  });

  it('generates a UUID trace id when the header is missing', async () => {
    const res = await request(app.getHttpServer()).get('/test/ping');
    expect(res.headers['x-trace-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('answers ping without credentials', async () => {
    await request(app.getHttpServer()).get('/test/ping').expect(200);
  });

  it('rejects an unauthenticated 1 MB body with 401', async () => {
    await request(app.getHttpServer())
      .post('/pdf')
      .send(bigHtml(1024 * 1024))
      .expect(401);
  });

  it('rejects an authenticated 3 MB body with 413', async () => {
    await postPdf(app, bigHtml(3 * 1024 * 1024)).expect(413);
  });

  it('applies the default limit to other routes', async () => {
    await request(app.getHttpServer())
      .post('/test/ping')
      .send(bigHtml(200 * 1024))
      .expect(413);
  });

  it('logs cluster-closed on shutdown', async () => {
    const closing = await createApp();
    const logs = captureLogs();
    try {
      await closing.close();
      expect(logs.byType('pdf-generator|cluster-closed').length).toBeGreaterThan(0);
    } finally {
      logs.restore();
    }
  });
});
