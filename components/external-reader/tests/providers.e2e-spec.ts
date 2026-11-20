import { INestApplication } from '@nestjs/common';
import nock from 'nock';
import request from 'supertest';

import { createE2eApp, setConfig, TEST_AUTH_PASSWORD, TEST_AUTH_USERNAME } from './helpers/create-app';

const UP = 'http://upstream.e2e.test';
const OPEN = 'http://open.e2e.test';

describe('Providers (e2e)', () => {
  let app: INestApplication;
  let restore: () => void;

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

  beforeEach(async () => {
    restore = setConfig({
      services: {
        'e2e-http': { isEnabled: true, class: 'HttpProvider', options: { baseUrl: UP, allowedPaths: ['/api/', '/exact'] } },
        'e2e-open': { isEnabled: true, class: 'HttpProvider', options: { baseUrl: OPEN } },
        'e2e-off': { isEnabled: false, class: 'HttpProvider' },
        'e2e-missing': { isEnabled: true, class: 'NoSuchProvider' },
      },
    });
    app = await createE2eApp();
  });

  afterEach(async () => {
    await app.close();
    restore();
    nock.cleanAll();
  });

  const post = (path: string, body?: unknown) =>
    request(app.getHttpServer())
      .post(path)
      .auth(TEST_AUTH_USERNAME, TEST_AUTH_PASSWORD)
      .send(body as object);

  it('GET returns the raw body without data envelope', async () => {
    nock(UP)
      .get('/api/items')
      .query({ q: 'x' })
      .reply(200, { items: [1] });
    const res = await post('/e2e-http/get', { url: '/api/items', params: { q: 'x' } }).expect(200);
    expect(res.body).toEqual({ status: 200, data: { items: [1] } });
  });

  it.each(['post', 'put', 'patch'] as const)('%s forwards method and JSON body', async (method) => {
    nock(UP)[method]('/api/items', { a: 1 }).reply(200, { ok: method });
    const res = await post(`/e2e-http/${method}`, { url: '/api/items', data: { a: 1 } }).expect(200);
    expect(res.body).toEqual({ status: 200, data: { ok: method } });
  });

  it('DELETE forwards the method', async () => {
    nock(UP).delete('/api/items/1').reply(200, { deleted: true });
    const res = await post('/e2e-http/delete', { url: '/api/items/1' }).expect(200);
    expect(res.body).toEqual({ status: 200, data: { deleted: true } });
  });

  it('accepts the extraParams form', async () => {
    nock(UP).get('/api/items').reply(200, { ok: true });
    const res = await post('/e2e-http/get', { extraParams: { url: '/api/items' }, userFilter: { ipn: '0000000000' } }).expect(200);
    expect(res.body).toEqual({ status: 200, data: { ok: true } });
  });

  it('passes through upstream error statuses', async () => {
    nock(UP).get('/api/items').reply(500, { err: 'x' });
    const res = await post('/e2e-http/get', { url: '/api/items' }).expect(200);
    expect(res.body).toEqual({ status: 500, data: { err: 'x' } });
  });

  it('network error is a 500 filter envelope', async () => {
    nock(UP).get('/api/items').replyWithError('boom');
    const res = await post('/e2e-http/get', { url: '/api/items' }).expect(500);
    expect(res.body.data.result.statusCode).toBe(500);
    expect(res.body.data.message).toMatch(/^InternalServerErrorException/);
  });

  it.each([
    ['missing url', {}],
    ['url not a string', { url: 5 }],
    ['absolute url', { url: 'http://evil.e2e.test/x' }],
    ['protocol-relative url', { url: '//evil.e2e.test' }],
    ['dot-dot segment', { url: '/api/../secret' }],
    ['backslash', { url: '/api/a\\b' }],
    ['at sign', { url: '/api/x@y' }],
    ['control char', { url: '/api/%0a' }],
    ['bad percent-encoding', { url: '/api/%E0%A4%A' }],
    ['outside allowedPaths', { url: '/other/path' }],
    ['exact entry with suffix', { url: '/exact/more' }],
  ])('rejects %s with 400', async (_name, body) => {
    const res = await post('/e2e-http/get', body).expect(400);
    expect(res.body.data.result.statusCode).toBe(400);
  });

  it('exact allowedPaths entry matches exactly', async () => {
    nock(UP).get('/exact').reply(200, { ok: true });
    await post('/e2e-http/get', { url: '/exact' }).expect(200);
  });

  it('service without allowedPaths accepts any relative path', async () => {
    nock(OPEN).get('/anything').reply(200, { ok: true });
    await post('/e2e-open/get', { url: '/anything' }).expect(200);
  });

  it('unknown service, method, disabled and missing class are 400', async () => {
    const unknown = await post('/nope/get', { url: '/x' }).expect(400);
    expect(unknown.body.data.message).toContain('Method get not found for service nope');
    await post('/e2e-http/head', { url: '/api/x' }).expect(400);
    await post('/e2e-off/get', { url: '/x' }).expect(400);
    await post('/e2e-missing/get', { url: '/x' }).expect(400);
  });

  it('requires credentials', async () => {
    await request(app.getHttpServer()).post('/e2e-http/get').send({ url: '/api/items' }).expect(401);
  });
});
