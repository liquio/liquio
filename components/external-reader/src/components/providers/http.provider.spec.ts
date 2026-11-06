import http from 'http';
import { AddressInfo } from 'net';

import axios from 'axios';

import { HttpProvider } from './http.provider';

describe('HttpProvider logging', () => {
  const logger = { debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  let provider: HttpProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new HttpProvider(logger as any, { baseUrl: 'http://localhost' });
    jest.spyOn(provider as any, 'request').mockResolvedValue({ status: 200, data: {} });
  });

  const allLogged = () => JSON.stringify([...logger.debug.mock.calls, ...logger.error.mock.calls, ...logger.log.mock.calls]);

  it('does not log request body values (ipn/edrpou) on debug', async () => {
    const body = { url: '/x', params: { ipn: '1234567890' }, userFilter: { ipn: '1234567890', edrpou: '12345678' } };
    for (const m of ['get', 'post', 'put', 'delete', 'patch'] as const) {
      await provider[m](body as any);
    }
    expect(logger.debug).toHaveBeenCalled();
    for (const [, payload] of logger.debug.mock.calls) {
      expect(payload).not.toHaveProperty('requestBody');
    }
    expect(allLogged()).not.toContain('1234567890');
    expect(allLogged()).not.toContain('12345678"');
  });

  it('does not log targetBody on validation failure', async () => {
    await expect(provider.get({ extraParams: { ipn: '1234567890' } } as any)).rejects.toThrow();
    expect(logger.error).toHaveBeenCalledWith('http-provider|validate-failed', expect.not.objectContaining({ targetBody: expect.anything() }));
    expect(allLogged()).not.toContain('1234567890');
  });
});

describe('HttpProvider url guard', () => {
  const logger = { debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;

  const build = (options: Record<string, unknown> = {}) => {
    const provider = new HttpProvider(logger as any, { baseUrl: 'http://reader.internal', headers: { Authorization: 'Bearer secret' }, ...options });
    const request = jest.fn().mockResolvedValue({ status: 200, data: {}, headers: {} });
    (provider as any).client = { request };
    return { provider, request };
  };

  const badUrls = [
    'http://169.254.169.254/latest/meta-data',
    'https://host',
    '//host/x',
    '\\\\host\\x',
    'file:///etc/passwd',
    'javascript:alert(1)',
    '/a/../b',
    '../b',
    '/a/%2e%2e/b',
    '/a/%2E%2E/b',
    '/a@b',
    'user@host/x',
    '/a\r\nHost: evil',
    '/a%0d%0ab',
    '/%zz',
  ];

  describe.each(methods)('%s', (method) => {
    it.each(badUrls)('rejects %j with 400 and sends no request', async (url) => {
      const { provider, request } = build();
      await expect(provider[method]({ extraParams: { url } } as any)).rejects.toMatchObject({ status: 400 });
      expect(request).not.toHaveBeenCalled();
    });

    it('rejects an absolute url in the top-level body (no extraParams)', async () => {
      const { provider, request } = build();
      await expect(provider[method]({ url: 'http://169.254.169.254/' } as any)).rejects.toMatchObject({ status: 400 });
      expect(request).not.toHaveBeenCalled();
    });

    it('lets a relative path through', async () => {
      const { provider, request } = build();
      await expect(provider[method]({ extraParams: { url: '/v1/items?x=1' } } as any)).resolves.toMatchObject({ status: 200 });
      expect(request).toHaveBeenCalledWith(expect.objectContaining({ url: '/v1/items?x=1' }));
    });
  });

  it('accepts a plain relative path and an empty url', async () => {
    const { provider, request } = build();
    await provider.get({ extraParams: { url: 'items/1' } } as any);
    await provider.get({ extraParams: { url: '' } } as any);
    expect(request).toHaveBeenCalledTimes(2);
  });

  describe('allowedPaths', () => {
    it('allows exact paths and prefixes, rejects the rest', async () => {
      const { provider, request } = build({ allowedPaths: ['/health', '/api/v1/'] });
      await provider.get({ extraParams: { url: '/health?x=1' } } as any);
      await provider.get({ extraParams: { url: '/api/v1/items' } } as any);
      expect(request).toHaveBeenCalledTimes(2);

      for (const url of ['/healthz', '/api/v10/items', '/admin', '/api/v1']) {
        await expect(provider.get({ extraParams: { url } } as any)).rejects.toMatchObject({ status: 400 });
      }
      expect(request).toHaveBeenCalledTimes(2);
    });
  });

  describe('axios client', () => {
    it('is created with absolute urls and redirects disabled and a response cap', () => {
      const create = jest.spyOn(axios, 'create');
      new HttpProvider(logger as any, { baseUrl: 'http://reader.internal', headers: { Authorization: 'Bearer secret' } });
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ allowAbsoluteUrls: false, maxRedirects: 0, maxContentLength: 10 * 1024 * 1024 }));
      create.mockRestore();
    });

    it('never reaches another host: a real request with an absolute url is rejected before the network, a relative one hits baseUrl with configured headers only', async () => {
      const server = http.createServer((req, res) => {
        if (req.url === '/redirect') {
          res.writeHead(302, { Location: 'http://127.0.0.1:1/stolen' });
          return res.end();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ auth: req.headers.authorization, cookie: req.headers.cookie ?? null }));
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const { port } = server.address() as AddressInfo;

      try {
        const provider = new HttpProvider(logger as any, { baseUrl: `http://127.0.0.1:${port}`, headers: { Authorization: 'Bearer secret' } });

        const ok = await provider.get({ extraParams: { url: '/x' }, userFilter: { ipn: '1' } } as any);
        expect(ok).toMatchObject({ status: 200, data: { auth: 'Bearer secret', cookie: null } });

        // Redirect is returned as is, not followed.
        const redirect = await provider.get({ extraParams: { url: '/redirect' } } as any);
        expect(redirect.status).toBe(302);
      } finally {
        server.close();
      }
    });
  });
});
