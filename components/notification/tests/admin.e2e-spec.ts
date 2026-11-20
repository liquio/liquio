import crypto from 'node:crypto';

import { clearAdminSessionsForTests } from '../src/controllers/adminSession';
import { TestApp, TEST_ADMIN } from './test-app';

const adminConfig = TEST_ADMIN;

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
    expect(cookie).toMatch(/^adminSid=[0-9a-f]{64};/);
    expect(cookie).toMatch(/Max-Age=28800/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/admin/);
    expect(cookie).not.toMatch(/Secure/);
  });

  it('marks the session cookie Secure behind https and issues a new id per login', async () => {
    const creds = { login: adminConfig.login, pass: adminConfig.password };
    const first = await app.request().post('/admin/login').set('X-Forwarded-Proto', 'https').type('form').send(creds);
    const second = await app.request().post('/admin/login').type('form').send(creds);
    expect(first.headers['set-cookie'][0]).toMatch(/Secure/);
    expect(first.headers['set-cookie'][0].split(';')[0]).not.toBe(second.headers['set-cookie'][0].split(';')[0]);
  });

  it('invalidates the session server-side on logout (a copied cookie stops working)', async () => {
    const login = await app.request().post('/admin/login').type('form').send({ login: adminConfig.login, pass: adminConfig.password });
    const cookie = login.headers['set-cookie'][0];
    expect((await app.request().get('/admin').set('Cookie', cookie)).status).toBe(200);

    const logout = await app.request().get('/admin/logout').set('Cookie', cookie);
    expect(logout.status).toBe(302);

    const after = await app.request().get('/admin').set('Cookie', cookie);
    expect(after.status).toBe(302);
    expect(after.headers.location).toBe('/admin/login');
    const api = await app.request().post('/admin/api/message/phonesList').set('Cookie', cookie).send({});
    expect(api.status).toBe(401);
  });

  it('rejects the old static HMAC cookie on the admin view', async () => {
    const hmac = crypto.createHmac('sha256', adminConfig.password).update(adminConfig.login).digest('hex');
    const res = await app.request().get('/admin').set('Cookie', `myCookie=${hmac}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/login');
  });

  it('rate limits repeated failed logins', async () => {
    let status = 0;
    for (let i = 0; i < 12; i++) {
      status = (await app.request().post('/admin/login').type('form').send({ login: 'x', pass: 'y' })).status;
    }
    expect(status).toBe(429);
    clearAdminSessionsForTests();
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
      const res = await app.request().post(route).set('Cookie', 'adminSid=forged').send({});
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

  describe('queue actions are POST-only and protected (NT-06)', () => {
    const login = async () => {
      const res = await app.request().post('/admin/login').type('form').send({ login: adminConfig.login, pass: adminConfig.password });
      return res.headers['set-cookie'][0];
    };

    it.each(['/admin/api/queue/clear/undefined', '/admin/api/queue/clear/1', '/admin/api/queue/resend/1'])('GET %s is not routed', async (route) => {
      const res = await app
        .request()
        .get(route)
        .set('Cookie', await login());
      expect(res.status).toBe(404);
    });

    it('POST clear without a session is 401, with a foreign Origin 403, with an undefined id 400', async () => {
      expect((await app.request().post('/admin/api/queue/clear/1').send({})).status).toBe(401);
      const cookie = await login();
      expect((await app.request().post('/admin/api/queue/clear/1').set('Cookie', cookie).set('Origin', 'https://evil.example').send({})).status).toBe(
        403,
      );
      expect((await app.request().post('/admin/api/queue/clear/undefined').set('Cookie', cookie).send({})).status).toBe(400);
      expect((await app.request().post('/admin/api/queue/clear-all').set('Cookie', cookie).send({})).status).toBe(400);
    });
  });
});
