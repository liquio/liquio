import { readFileSync } from 'node:fs';
import path from 'node:path';

import { TestApp } from './test-app';

const adminConfig = JSON.parse(readFileSync(path.join(__dirname, '../../../config-templates/notification/config.json'), 'utf8')).production
  .adminConfig;

describe('Admin static routes', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  it('serves the login page unauthenticated', async () => {
    const res = await app.request().get('/admin/login');
    expect(res.status).toBe(200);
    expect(res.type).toBe('text/html');
  });

  it('redirects an unauthenticated admin view to the login page', async () => {
    const res = await app.request().get('/admin');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/login');
  });

  it('rejects a bad login without setting a cookie', async () => {
    const res = await app.request().post('/admin/login').type('form').send({ login: 'wrong', pass: 'wrong' });
    expect(res.status).toBe(400);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('sets a 24h session cookie and redirects to /admin on a correct login', async () => {
    const res = await app.request().post('/admin/login').type('form').send({ login: adminConfig.login, pass: adminConfig.password });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin');
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^myCookie=/);
    expect(cookie).toMatch(/Max-Age=86400/);
    expect(cookie).toMatch(/HttpOnly/);
  });

  it('grants access to the admin view once the session cookie is set', async () => {
    const login = await app.request().post('/admin/login').type('form').send({ login: adminConfig.login, pass: adminConfig.password });
    const cookie = login.headers['set-cookie'][0];

    const res = await app.request().get('/admin').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.type).toBe('text/html');
  });

  describe('cookie-protected message API used by the admin UI', () => {
    const paths = ['/admin/api/message/phonesList', '/admin/api/message/eventId'];

    it.each(paths)('POST %s rejects requests without the admin cookie', async (route) => {
      const res = await app.request().post(route).send({});
      expect(res.status).toBe(401);
    });

    it.each(paths)('POST %s rejects a forged admin cookie', async (route) => {
      const res = await app.request().post(route).set('Cookie', 'myCookie=forged').send({});
      expect(res.status).toBe(401);
    });

    it.each(paths)('POST %s rejects a foreign Origin even with the cookie', async (route) => {
      const login = await app.request().post('/admin/login').type('form').send({ login: adminConfig.login, pass: adminConfig.password });
      const res = await app.request().post(route).set('Cookie', login.headers['set-cookie'][0]).set('Origin', 'https://evil.example').send({});
      expect(res.status).toBe(403);
    });

    it.each(paths)('POST %s passes authentication with the admin cookie and no Basic header', async (route) => {
      const login = await app.request().post('/admin/login').type('form').send({ login: adminConfig.login, pass: adminConfig.password });
      const res = await app.request().post(route).set('Cookie', login.headers['set-cookie'][0]).send({});
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });
});
