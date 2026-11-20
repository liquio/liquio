const mockLogSave = jest.fn();
jest.mock('@liquio/back-core', () => ({ Log: { getInstance: () => ({ save: mockLogSave }) } }));

import express from 'express';
import request from 'supertest';

import { useCors } from './cors';

function buildApp(cors?: { allowedOrigins?: string[]; maxAge?: number }) {
  const app = express() as unknown as Parameters<typeof useCors>[0];
  app.config = { cors } as never;
  useCors(app);
  (app as unknown as express.Express).get('/ping', (_req, res) => res.json({ ok: true }));
  return app as unknown as express.Express;
}

describe('useCors', () => {
  beforeEach(() => mockLogSave.mockClear());

  it('sends no CORS headers when nothing is configured', async () => {
    const res = await request(buildApp()).get('/ping').set('Origin', 'https://evil.example');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('echoes a listed origin with credentials', async () => {
    const res = await request(buildApp({ allowedOrigins: ['https://app.example'] }))
      .get('/ping')
      .set('Origin', 'https://app.example');
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('answers preflight for a listed origin', async () => {
    const res = await request(buildApp({ allowedOrigins: ['https://app.example'], maxAge: 600 }))
      .options('/ping')
      .set('Origin', 'https://app.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['access-control-max-age']).toBe('600');
  });

  it('sends no CORS headers for an unlisted origin, including prefix/port/scheme variants', async () => {
    const app = buildApp({ allowedOrigins: ['https://app.example'] });
    for (const origin of ['https://evil.example', 'https://app.example.evil.example', 'http://app.example', 'https://app.example:8443']) {
      const res = await request(app).get('/ping').set('Origin', origin);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
      expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    }
  });

  it('ignores a wildcard with credentials and logs an error', async () => {
    const app = buildApp({ allowedOrigins: ['*'] });
    const res = await request(app).get('/ping').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    expect(mockLogSave).toHaveBeenCalledWith('cors-wildcard-origin-ignored', expect.anything(), 'error');
  });

  it('keeps listed origins when a wildcard is mixed in', async () => {
    const app = buildApp({ allowedOrigins: ['*', 'https://app.example'] });
    const ok = await request(app).get('/ping').set('Origin', 'https://app.example');
    const bad = await request(app).get('/ping').set('Origin', 'https://evil.example');
    expect(ok.headers['access-control-allow-origin']).toBe('https://app.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});
