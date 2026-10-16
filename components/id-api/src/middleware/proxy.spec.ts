const mockLogSave = jest.fn();
jest.mock('@liquio/back-core', () => ({ Log: { getInstance: () => ({ save: mockLogSave }) } }));

import http from 'http';
import { AddressInfo } from 'net';

import express from 'express';
import request from 'supertest';

import { useProxy } from './proxy';

function buildApp(eds?: Record<string, unknown>) {
  const app = express() as unknown as Parameters<typeof useProxy>[0];
  app.config = { eds } as never;
  useProxy(app);
  return app as unknown as express.Express;
}

describe('useProxy', () => {
  let upstream: http.Server;
  let upstreamUrl: string;
  let upstreamCalls: http.IncomingMessage[];

  beforeAll(async () => {
    upstream = http.createServer((req, res) => {
      upstreamCalls.push(req);
      res.setHeader('Content-Type', 'text/plain');
      res.end('upstream-ok');
    });
    await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
    upstreamUrl = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise((resolve) => upstream.close(resolve)));

  beforeEach(() => {
    upstreamCalls = [];
    mockLogSave.mockClear();
  });

  it('registers no proxy routes by default', async () => {
    const app = buildApp();
    expect((await request(app).get('/proxy/ics.gov.ua/')).status).toBe(404);
    expect((await request(app).post('/proxy/authorise/eds/x')).status).toBe(404);
  });

  it('does not register the ics.gov.ua proxy unless enabled with allowed paths', async () => {
    expect((await request(buildApp({ ics_proxy: { enabled: true } })).get('/proxy/ics.gov.ua/')).status).toBe(404);
    expect((await request(buildApp({ ics_proxy: { allowed_paths: ['/a'] } })).get('/proxy/ics.gov.ua/a')).status).toBe(404);
  });

  it('rejects non-GET and non-allowlisted ics.gov.ua requests without an upstream call', async () => {
    const app = buildApp({ ics_proxy: { enabled: true, allowed_paths: ['/CACertificates.p7b'] } });
    expect((await request(app).post('/proxy/ics.gov.ua/CACertificates.p7b')).status).toBe(405);
    expect((await request(app).get('/proxy/ics.gov.ua/other')).status).toBe(404);
    expect((await request(app).get('/proxy/ics.gov.ua/CACertificates.p7b/../x')).status).toBe(404);
  });

  it('fails closed when sign_proxy_url is set without allowed paths', async () => {
    const res = await request(buildApp({ sign_proxy_url: upstreamUrl })).get('/proxy/authorise/eds/sign');
    expect(res.status).toBe(404);
    expect(upstreamCalls).toHaveLength(0);
    expect(mockLogSave).toHaveBeenCalledWith('eds-proxy|disabled', expect.anything(), 'error');
  });

  describe('eds sign proxy enabled', () => {
    const eds = () => ({ sign_proxy_url: upstreamUrl, sign_proxy_allowed_paths: ['/sign'] });

    it('proxies an allow-listed path and strips credentials', async () => {
      const res = await request(buildApp(eds()))
        .post('/proxy/authorise/eds/sign')
        .set('Cookie', 'sid=secret')
        .set('Authorization', 'Bearer secret')
        .send('data');
      expect(res.status).toBe(200);
      expect(res.text).toBe('upstream-ok');
      expect(upstreamCalls).toHaveLength(1);
      expect(upstreamCalls[0].headers.cookie).toBeUndefined();
      expect(upstreamCalls[0].headers.authorization).toBeUndefined();
    });

    it('rejects disallowed methods and paths without an upstream call', async () => {
      const app = buildApp(eds());
      expect((await request(app).delete('/proxy/authorise/eds/sign')).status).toBe(405);
      expect((await request(app).post('/proxy/authorise/eds/admin')).status).toBe(404);
      expect((await request(app).post('/proxy/authorise/eds/sign/../admin')).status).toBe(404);
      expect(upstreamCalls).toHaveLength(0);
    });

    it('logs only query parameter names on proxy errors', async () => {
      const app = buildApp({ sign_proxy_url: 'http://127.0.0.1:1', sign_proxy_allowed_paths: ['/sign'] });
      const res = await request(app).get('/proxy/authorise/eds/sign?token=SECRET');
      expect(res.status).toBe(503);
      const logged = JSON.stringify(mockLogSave.mock.calls);
      expect(logged).toContain('token');
      expect(logged).not.toContain('SECRET');
    });
  });
});
