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
    getAuthMiddleware: () => (req: any, res: any, next: any) => {
      if (!req.headers['x-auth']) {
        return res.status(401).end();
      }
      req.authUserInfo = { userId: 'u1' };
      req.authUserUnits = [1];
      req.separatedAuthUserUnits = { head: [], member: [1] };
      req.authUserUnitEntities = { all: [{ allowTokens: ['t1'] }] };
      next();
    },
    getCheckUserInOneOfUnits: () => (_req: any, _res: any, next: any) => next(),
  })),
);

describe('Router custom APIs', () => {
  let upstream: http.Server;
  let server: http.Server;
  let received: string[];
  let receivedHeaders: http.IncomingHttpHeaders[];
  let base: string;
  let logSave: jest.Mock;

  beforeAll(async () => {
    upstream = http.createServer((req, res) => {
      received.push(req.url as string);
      receivedHeaders.push(req.headers);
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
          { apiName: 'authed', proxyTo, sendUserData: false, authHeader: 'Bearer configured', allowedPaths: [{ method: 'GET', path: '/x' }] },
          { apiName: 'bearer', proxyTo, sendUserData: false, allowedPaths: [{ method: 'GET', path: '/x', authorizationHeader: 'Bearer own' }] },
          { apiName: 'fwd', proxyTo, sendUserData: false, allowedPaths: [{ method: 'GET', path: '/x', forwardClientToken: true }] },
          { apiName: 'fwd-bad', proxyTo, allowedPaths: [{ method: 'GET', path: '/x', forwardClientToken: true }] },
          { apiName: 'cfg', proxyTo, sendUserData: false, headers: { 'Allow-Tokens': 'configured' }, allowedPaths: [{ method: 'GET', path: '/x' }] },
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
    receivedHeaders = [];
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

  it('strips client token, cookie and authorization and applies the configured authHeader', async () => {
    const headers = { token: 'cabinet-jwt', cookie: 'sid=1', authorization: 'Bearer client' };
    expect((await fetch(`${base}/custom/authed/x`, { headers })).status).not.toBe(200);
    expect((await fetch(`${base}/custom/public/listed`, { headers })).status).not.toBe(200);
    expect(received).toEqual([]);

    expect((await fetch(`${base}/custom/authed/x`, { headers: { token: 'cabinet-jwt', cookie: 'sid=1' } })).status).toBe(200);
    expect(receivedHeaders[0].token).toBeUndefined();
    expect(receivedHeaders[0].cookie).toBeUndefined();
    expect(receivedHeaders[0].authorization).toBe('Bearer configured');
  });

  it('strips token/cookie on an unconfigured public API and re-applies the path authorizationHeader', async () => {
    expect((await fetch(`${base}/custom/public/listed`, { headers: { token: 'cabinet-jwt', cookie: 'sid=1' } })).status).toBe(200);
    expect(receivedHeaders[0].token).toBeUndefined();
    expect(receivedHeaders[0].cookie).toBeUndefined();
    expect(receivedHeaders[0].authorization).toBeUndefined();

    expect((await fetch(`${base}/custom/bearer/x`, { headers: { token: 't', authorization: 'Bearer own' } })).status).toBe(200);
    expect(receivedHeaders[1].token).toBeUndefined();
    expect(receivedHeaders[1].authorization).toBe('Bearer own');
  });

  it('forwards token only for a public path with forwardClientToken, and rejects it for authenticated APIs', async () => {
    expect((await fetch(`${base}/custom/fwd/x`, { headers: { token: 'own-value', cookie: 'sid=1' } })).status).toBe(200);
    expect(receivedHeaders[0].token).toBe('own-value');
    expect(receivedHeaders[0].cookie).toBeUndefined();

    expect((await fetch(`${base}/custom/fwd-bad/x`, { headers: { 'x-auth': '1' } })).status).toBe(404);
    expect(logSave).toHaveBeenCalledWith('custom-api-invalid-config', expect.objectContaining({ apiName: 'fwd-bad' }));
  });

  const b64 = (value: any) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
  const forged = { 'User-Data': b64({ userId: 'evil' }), 'Allow-Tokens': b64(['evil']) };

  it('drops client User-Data/Allow-Tokens on a public custom API (User-Data reset to null)', async () => {
    expect((await fetch(`${base}/custom/public/listed`, { headers: forged })).status).toBe(200);
    expect(receivedHeaders[0]['user-data']).toBe('bnVsbA==');
    expect(receivedHeaders[0]['allow-tokens']).toBeUndefined();
  });

  it('sends cabinet-generated User-Data/Allow-Tokens, not the client ones, on an authenticated custom API', async () => {
    expect((await fetch(`${base}/custom/secured/items/1`, { headers: { 'x-auth': '1', ...forged } })).status).toBe(200);
    const userData = JSON.parse(Buffer.from(receivedHeaders[0]['user-data'] as string, 'base64').toString());
    expect(userData.userId).toBe('u1');
    expect(JSON.parse(Buffer.from(receivedHeaders[0]['allow-tokens'] as string, 'base64').toString())).toEqual(['t1']);
  });

  it('keeps a server-configured Allow-Tokens header, not the client one', async () => {
    expect((await fetch(`${base}/custom/cfg/x`, { headers: forged })).status).toBe(200);
    expect(receivedHeaders[0]['allow-tokens']).toBe('configured');
  });

  it('drops client User-Data/Allow-Tokens on the main proxy', async () => {
    const config = (global as any).config.discovery;
    config.mainProxy = `http://localhost:${(upstream.address() as AddressInfo).port}`;
    const mainApp = express();
    new Router().initRoutes(mainApp);
    delete config.mainProxy;
    const mainServer = http.createServer(mainApp);
    await new Promise<void>((resolve) => mainServer.listen(0, resolve));
    const mainBase = `http://localhost:${(mainServer.address() as AddressInfo).port}`;
    try {
      expect((await fetch(`${mainBase}/some/path`, { headers: { ...forged, accept: 'text/plain' } })).status).toBe(200);
    } finally {
      await new Promise((resolve) => mainServer.close(resolve));
    }
    expect(received).toEqual(['/some/path']);
    expect(receivedHeaders[0]['user-data']).toBeUndefined();
    expect(receivedHeaders[0]['allow-tokens']).toBeUndefined();
    expect(receivedHeaders[0].accept).toBe('text/plain');
  });
});
