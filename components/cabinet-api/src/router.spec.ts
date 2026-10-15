import http from 'node:http';
import type { AddressInfo } from 'node:net';

import express from 'express';

import Router from './router';

jest.mock('@liquio/back-core', () => ({
  AppInfo: class {
    name = 'cabinet-api';
  },
  asyncLocalStorageMiddleware: (_req: any, _res: any, next: any) => next(),
  getTraceId: () => 'trace',
}));
jest.mock('./controllers/test', () => jest.fn().mockImplementation(() => ({ ping: jest.fn() })));
jest.mock('./lib/app_ident_headers', () => ({ middleware: jest.fn() }));
jest.mock('./controllers/auth', () =>
  jest.fn().mockImplementation(() => ({
    initRoutes: jest.fn(),
    // Authenticated routes require the `x-auth` header.
    getAuthMiddleware: () => (req: any, res: any, next: any) => (req.headers['x-auth'] ? next() : res.status(401).end()),
    getCheckUserInOneOfUnits: () => (_req: any, _res: any, next: any) => next(),
  })),
);

describe('Router custom APIs', () => {
  let upstream: http.Server;
  let server: http.Server;
  let received: string[];
  let base: string;
  let logSave: jest.Mock;

  beforeAll(async () => {
    upstream = http.createServer((req, res) => {
      received.push(req.url as string);
      res.end('ok');
    });
    await new Promise<void>((resolve) => upstream.listen(0, resolve));
    const proxyTo = `http://localhost:${(upstream.address() as AddressInfo).port}`;

    logSave = jest.fn();
    (global as any).log = { save: logSave };
    (global as any).config = {
      server: { maxBodySize: '1mb' },
      discovery: {
        customApis: [
          { apiName: 'secured', proxyTo, allowedPaths: [{ method: 'GET', path: '/items/:id' }] },
          { apiName: 'public', proxyTo, sendUserData: false, allowedPaths: [{ method: 'GET', path: '/listed' }] },
          { apiName: 'broken', proxyTo, sendUserData: false },
          { apiName: 'broken-empty', proxyTo, sendUserData: false, allowedPaths: [] },
        ],
      },
    };

    const app = express();
    new Router().initRoutes(app);
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    base = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await Promise.all([upstream, server].map((s) => new Promise((resolve) => s.close(resolve))));
  });

  beforeEach(() => {
    received = [];
  });

  it('does not register an API without allowedPaths and logs the invalid config', async () => {
    expect((await fetch(`${base}/custom/broken/anything`)).status).toBe(404);
    expect((await fetch(`${base}/custom/broken-empty/anything`)).status).toBe(404);
    expect(received).toEqual([]);
    expect(logSave).toHaveBeenCalledWith('custom-api-invalid-config', expect.objectContaining({ apiName: 'broken' }));
    expect(logSave).toHaveBeenCalledWith('custom-api-invalid-config', expect.objectContaining({ apiName: 'broken-empty' }));
  });

  it('requires authentication by default', async () => {
    expect((await fetch(`${base}/custom/secured/items/1`)).status).toBe(401);
    expect(received).toEqual([]);
    expect((await fetch(`${base}/custom/secured/items/1`, { headers: { 'x-auth': '1' } })).status).toBe(200);
    expect(received).toEqual(['/items/1']);
  });

  it('limits a public API to the listed paths and method', async () => {
    expect((await fetch(`${base}/custom/public/listed`)).status).toBe(200);
    expect(received).toEqual(['/listed']);
    expect((await fetch(`${base}/custom/public/other`)).status).not.toBe(200);
    expect((await fetch(`${base}/custom/public/listed`, { method: 'POST' })).status).not.toBe(200);
    expect(received).toEqual(['/listed']);
  });

  it('rejects encoded separators and dot segments', async () => {
    for (const path of ['/items/1%2F..%2Fsecret', '/items/1%5c2', '/items/%00']) {
      const res = await fetch(`${base}/custom/secured${path}`, { headers: { 'x-auth': '1' } });
      expect(res.status).not.toBe(200);
    }
    expect(received).toEqual([]);
  });
});
