import { readFileSync } from 'node:fs';
import path from 'node:path';

import { TestApp } from './test-app';

const adminConfig = JSON.parse(
  readFileSync(path.join(__dirname, '../../config-templates/notification/config.json'), 'utf8'),
).production.adminConfig;

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
});
