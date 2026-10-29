import { INestApplication } from '@nestjs/common';
import nock from 'nock';
import request from 'supertest';

import { createE2eApp, setConfig } from './helpers/create-app';
import { LogCapture } from './helpers/log-capture';

describe('Logging (e2e)', () => {
  let app: INestApplication | undefined;
  let capture: LogCapture;
  const restores: Array<() => void> = [];
  const savedEnv: Record<string, string | undefined> = {};

  const setEnv = (name: string, value: string) => {
    if (!(name in savedEnv)) savedEnv[name] = process.env[name];
    process.env[name] = value;
  };

  beforeAll(() => {
    if (!nock.isActive()) nock.activate();
    nock.disableNetConnect();
    nock.enableNetConnect(/127\.0\.0\.1|localhost/);
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    nock.restore();
  });

  beforeEach(() => {
    capture = new LogCapture();
  });

  afterEach(async () => {
    capture.stop();
    await app?.close();
    app = undefined;
    restores.splice(0).forEach((r) => r());
    for (const [name, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
      delete savedEnv[name];
    }
    nock.cleanAll();
  });

  const startApp = async () => {
    app = await createE2eApp();
    capture.start();
    return request(app.getHttpServer());
  };

  it('logs request and response with trace id and app info', async () => {
    const api = await startApp();
    await api.get('/test/ping').set('x-trace-id', 'e2e-trace-1').expect(200);
    const req = capture.find(capture.stdout, 'http-request')[0];
    expect(req.data).toEqual(expect.objectContaining({ method: 'GET', url: '/test/ping' }));
    expect(req.traceId).toBe('e2e-trace-1');
    const res = capture.find(capture.stdout, 'http-response')[0];
    expect(res.data.status).toBe(200);
    for (const line of capture.stdout.filter((l) => l.json)) {
      expect(line.json.appInfo.name).toBe('liquio-external-reader');
    }
  });

  it('logs an error response to stderr', async () => {
    // Guard failures (401) happen before interceptors run, so they are not logged as http-response.
    restores.push(
      setConfig({ services: { 'e2e-http': { isEnabled: true, class: 'HttpProvider', options: { baseUrl: 'http://upstream.e2e.test' } } } }),
    );
    const api = await startApp();
    await api.post('/e2e-http/get').auth('e2e-user', 'e2e-password-0123456789').send({}).expect(400);
    const res = capture.find(capture.stderr, 'http-response')[0];
    expect(res.data.status).toBe(400);
  });

  it('redacts sensitive query values', async () => {
    const api = await startApp();
    await api.get('/test/ping?token=e2e-secret-value&ipn=1234567890').expect(200);
    for (const line of capture.all) {
      expect(line.raw).not.toContain('e2e-secret-value');
      expect(line.raw).not.toContain('1234567890');
    }
  });

  it('redacts secrets in provider network error logs', async () => {
    restores.push(
      setConfig({ services: { 'e2e-http': { isEnabled: true, class: 'HttpProvider', options: { baseUrl: 'http://upstream.e2e.test' } } } }),
    );
    const api = await startApp();
    nock('http://upstream.e2e.test').get('/api').query(true).replyWithError('boom');
    await api.post('/e2e-http/get').auth('e2e-user', 'e2e-password-0123456789').send({ url: '/api?token=e2e-secret-value' }).expect(500);
    const lines = capture.find(capture.all, 'http-provider|request-failed');
    expect(lines.length).toBeGreaterThan(0);
    for (const line of capture.all) {
      expect(line.raw).not.toContain('e2e-secret-value');
    }
  });

  it('LOG_DISABLE_DEFAULT_REDACTION keeps EXCLUDE_PARAMS redacted only', async () => {
    setEnv('LOG_DISABLE_DEFAULT_REDACTION', 'true');
    const api = await startApp();
    await api.get('/test/ping?password=e2e-default-secret&token=e2e-excluded-secret').expect(200);
    const raw = capture.all.map((l) => l.raw).join('\n');
    expect(raw).toContain('e2e-default-secret');
    expect(raw).not.toContain('e2e-excluded-secret');
  });

  it('LOG_LEVEL=debug logs provider keys only', async () => {
    setEnv('LOG_LEVEL', 'debug');
    restores.push(
      setConfig({ services: { 'e2e-http': { isEnabled: true, class: 'HttpProvider', options: { baseUrl: 'http://upstream.e2e.test' } } } }),
    );
    const api = await startApp();
    nock('http://upstream.e2e.test').get('/api/items').reply(200, {});
    await api.post('/e2e-http/get').auth('e2e-user', 'e2e-password-0123456789').send({ url: '/api/items' }).expect(200);
    const line = capture.find(capture.all, 'http-provider|get')[0];
    expect(line).toBeDefined();
    expect(line.data).toEqual({ keys: ['url'] });
  });
});
