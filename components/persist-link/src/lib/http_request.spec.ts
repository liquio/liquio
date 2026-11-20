import http from 'node:http';
import { AddressInfo } from 'node:net';
import { Readable } from 'node:stream';

import HttpRequest from './http_request';

describe('HttpRequest (axios)', () => {
  let server: http.Server;
  let baseUrl: string;
  let lastRequest: { method?: string; headers: http.IncomingHttpHeaders; body: string };

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        lastRequest = { method: req.method, headers: req.headers, body };
        if (req.url === '/json') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end('{"a":1}');
        }
        if (req.url === '/text') {
          return res.end('plain');
        }
        if (req.url === '/slow') {
          return setTimeout(() => res.end('late'), 500);
        }
        res.writeHead(404, { 'Content-Disposition': 'inline; filename="a.bin"' });
        res.end('not found');
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  describe('send', () => {
    it('should parse a JSON body', async () => {
      expect(await HttpRequest.send({ url: `${baseUrl}/json`, method: 'GET' })).toEqual({ a: 1 });
    });

    it('should return a non-JSON body as string', async () => {
      expect(await HttpRequest.send({ url: `${baseUrl}/text`, method: 'GET' })).toBe('plain');
    });

    it('should send body and headers and not reject on non-2xx status', async () => {
      const result = await HttpRequest.send({
        url: `${baseUrl}/missing`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: 't' },
        body: '{"x":1}',
      });
      expect(result).toBe('not found');
      expect(lastRequest.method).toBe('POST');
      expect(lastRequest.headers.token).toBe('t');
      expect(lastRequest.body).toBe('{"x":1}');
    });

    it('should reject on timeout', async () => {
      await expect(HttpRequest.send({ url: `${baseUrl}/slow`, method: 'GET', timeout: 50 })).rejects.toThrow();
    });

    it('should reject on network error', async () => {
      await expect(HttpRequest.send({ url: 'http://127.0.0.1:1/', method: 'GET' })).rejects.toThrow();
    });
  });

  describe('stream', () => {
    it('should return the body as a stream with upstream status and headers, also for non-2xx', async () => {
      const stream = await HttpRequest.stream({ url: `${baseUrl}/missing`, method: 'GET' });
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk);

      expect(stream.statusCode).toBe(404);
      expect(stream.headers['content-disposition']).toBe('inline; filename="a.bin"');
      expect(Buffer.concat(chunks).toString()).toBe('not found');
      expect(lastRequest.headers['accept-encoding']).toBe('identity');
    });
  });

  describe('upload', () => {
    it('should upload a stream and return the response body', async () => {
      const body = await HttpRequest.upload(
        { url: `${baseUrl}/missing`, method: 'POST', headers: { token: 't' } },
        Readable.from([Buffer.from('file-')]),
      );
      expect(body).toBe('not found');
      expect(lastRequest.method).toBe('POST');
    });
  });
});
