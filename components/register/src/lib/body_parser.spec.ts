import express from 'express';
import supertest from 'supertest';

import { createBodyParserMiddleware, isBulkRoute } from './body_parser';

const TOKEN = 'Basic dGVzdDp0ZXN0';

const makeApp = () => {
  const app = express();
  app.use(createBodyParserMiddleware({ defaultLimit: '1kb', bulkLimit: '10kb', tokens: [TOKEN] }));
  app.use((req, res) => res.json({ size: JSON.stringify(req.body || {}).length }));
  return app;
};

const payload = (chars: number) => ({ data: 'x'.repeat(chars) });

describe('createBodyParserMiddleware (RG-25)', () => {
  it('rejects an oversized body on an ordinary route with 413', async () => {
    const response = await supertest(makeApp()).post('/records').set('Authorization', TOKEN).send(payload(5000));
    expect(response.status).toBe(413);
  });

  it('accepts a body above the default limit on an authenticated bulk route', async () => {
    const response = await supertest(makeApp()).post('/records/bulk').set('Authorization', TOKEN).send(payload(5000));
    expect(response.status).toBe(200);
  });

  it('accepts the legacy `token` header on a bulk route', async () => {
    const response = await supertest(makeApp()).post('/registers/import').set('token', TOKEN).send(payload(5000));
    expect(response.status).toBe(200);
  });

  it('rejects an unauthenticated bulk request with 401 without parsing the body', async () => {
    const response = await supertest(makeApp()).post('/records/bulk').send(payload(5000));
    expect(response.status).toBe(401);
  });

  it('rejects a bulk request with a wrong token with 401', async () => {
    const response = await supertest(makeApp()).post('/import/start').set('Authorization', 'Basic aW52YWxpZDppbnZhbGlk').send(payload(5000));
    expect(response.status).toBe(401);
  });

  it('still enforces the bulk limit for authenticated callers', async () => {
    const response = await supertest(makeApp()).post('/records/bulk').set('Authorization', TOKEN).send(payload(20000));
    expect(response.status).toBe(413);
  });

  it('matches only the bulk routes', () => {
    expect(isBulkRoute('POST', '/records/bulk')).toBe(true);
    expect(isBulkRoute('POST', '/records/bulk-by-person')).toBe(true);
    expect(isBulkRoute('POST', '/registers/import')).toBe(true);
    expect(isBulkRoute('POST', '/import/start')).toBe(true);
    expect(isBulkRoute('POST', '/records')).toBe(false);
    expect(isBulkRoute('POST', '/records/filter')).toBe(false);
    expect(isBulkRoute('GET', '/records/bulk')).toBe(false);
  });
});
