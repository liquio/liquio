import express from 'express';
import request from 'supertest';

import { useCors } from '../src/middleware';

/**
 * CORS security: exercises the real `useCors` middleware (not a re-implementation).
 * OWASP A01:2021 - Broken Access Control.
 */
function buildApp(allowedOrigins?: string[]) {
  const app = express() as unknown as Parameters<typeof useCors>[0];
  app.config = { cors: allowedOrigins ? { allowedOrigins } : undefined } as never;
  useCors(app);
  const plain = app as unknown as express.Express;
  plain.get('/ping', (_req, res) => res.json({ ok: true }));
  return plain;
}

describe('CORS Security - id-api (real useCors)', () => {
  it('no config: no Access-Control-Allow-Origin', async () => {
    const res = await request(buildApp()).get('/ping').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('listed origin is echoed with Allow-Credentials: true', async () => {
    const res = await request(buildApp(['https://cabinet.example']))
      .get('/ping')
      .set('Origin', 'https://cabinet.example');
    expect(res.headers['access-control-allow-origin']).toBe('https://cabinet.example');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('unlisted origin gets no CORS headers', async () => {
    const res = await request(buildApp(['https://cabinet.example']))
      .get('/ping')
      .set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it("'*' in config is ignored with credentials", async () => {
    const res = await request(buildApp(['*']))
      .get('/ping')
      .set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('preflight for a listed origin succeeds, for an unlisted one carries no allow headers', async () => {
    const app = buildApp(['https://cabinet.example']);
    const ok = await request(app).options('/ping').set('Origin', 'https://cabinet.example').set('Access-Control-Request-Method', 'POST');
    expect(ok.status).toBe(204);
    expect(ok.headers['access-control-allow-origin']).toBe('https://cabinet.example');
    const bad = await request(app).options('/ping').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
    expect(bad.headers['access-control-allow-credentials']).toBeUndefined();
  });
});
