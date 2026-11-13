import * as jsonwebtoken from 'jsonwebtoken';
import type { Response as SupertestResponse } from 'supertest';

import { TestApp, JWT_SECRET, TASK_URL } from './test-app';

const CUSTOM_URL = 'http://custom.local:9000';
const ANOTHER_URL = 'http://another.local:9001';

const customApis = [
  {
    apiName: 'secured',
    proxyTo: CUSTOM_URL,
    headers: { 'X-Configured': 'configured' },
    allowedUnits: [],
    allowedPaths: [
      { method: 'GET', path: '/items' },
      { method: 'GET', path: '/items/:id' },
      { method: 'POST', path: '/items', authorizationHeader: 'Bearer client-secret' },
    ],
  },
  {
    apiName: 'units-only',
    proxyTo: CUSTOM_URL,
    allowedUnits: [900],
    allowedPaths: [{ method: 'GET', path: '/items' }],
  },
  {
    apiName: 'public',
    proxyTo: ANOTHER_URL,
    sendUserData: false,
    authHeader: 'Basic cHVibGljOnRlc3Q=',
    allowedPaths: [{ method: 'GET', path: '/open', forwardClientToken: true }],
  },
  {
    apiName: 'jwt-only',
    proxyTo: ANOTHER_URL,
    sendUserData: false,
    isCheckJwtOnly: true,
    allowedPaths: [{ method: 'GET', path: '/check' }],
  },
  { apiName: 'no-allow-list', proxyTo: ANOTHER_URL },
  {
    apiName: 'leaky',
    proxyTo: ANOTHER_URL,
    allowedPaths: [{ method: 'GET', path: '/leak', forwardClientToken: true }],
  },
];

describe('Custom APIs', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll({
      override: { discovery: { customApis, mainProxy: TASK_URL, mainProxyAllowPaths: [] } },
    });
    app = await TestApp.setup();

    await app.sql(
      `INSERT INTO units (id, name, members, heads, allow_tokens) VALUES
        (901, 'members-unit', ARRAY['test-user-1'], ARRAY[]::varchar[], ARRAY['token-a', 'token-b']),
        (902, 'heads-unit', ARRAY[]::varchar[], ARRAY['test-user-1'], ARRAY['token-b']),
        (903, 'other-unit', ARRAY['someone-else'], ARRAY[]::varchar[], ARRAY['token-c'])`,
    );
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  describe('authenticated custom API', () => {
    it('answers 401 without a token', async () => {
      await app.request().get('/custom/secured/items').expect(401);
    });

    it('proxies an allowed path with user data, allow tokens and configured headers', async () => {
      const { jwt, payload } = app.generateUserToken();
      app.mockUserInfo(payload.authTokens.accessToken, { email: 'user@example.test' });
      let received: Record<string, any> = {};
      app
        .nock(CUSTOM_URL)
        .get('/items/42')
        .query({ page: '2' })
        .reply(200, function () {
          received = this.req.headers;
          return { id: 42 };
        });

      await app
        .request()
        .get('/custom/secured/items/42?page=2')
        .set('token', jwt)
        .set('Cookie', 'session=fake')
        .set('User-Data', 'ZmFrZQ==')
        .set('Allow-Tokens', 'ZmFrZQ==')
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body).toEqual({ id: 42 });
        });

      expect(received).not.toHaveProperty('token');
      expect(received).not.toHaveProperty('cookie');
      expect(received['x-configured']).toBe('configured');
      expect(received['x-trace-id']).toBeDefined();

      const userData = JSON.parse(Buffer.from(received['user-data'], 'base64').toString('utf8'));
      expect(userData.userId).toBe('test-user-1');
      expect(userData.email).toBe('user@example.test');
      expect(userData.authUserUnits.sort()).toEqual([901, 902]);
      expect(userData.separatedAuthUserUnits).toEqual({ head: [902], member: [901], all: expect.arrayContaining([901, 902]) });
      const allowTokens = JSON.parse(Buffer.from(received['allow-tokens'], 'base64').toString('utf8'));
      expect(allowTokens.sort()).toEqual(['token-a', 'token-b']);
    });

    it('answers 500 and does not reach the custom API for a path outside of the allow-list', async () => {
      const { jwt, payload } = app.generateUserToken();
      app.mockUserInfo(payload.authTokens.accessToken);

      await app.request().get('/custom/secured/admin').set('token', jwt).expect(500);
    });

    it('rejects a method that is not allowed', async () => {
      const { jwt, payload } = app.generateUserToken();
      app.mockUserInfo(payload.authTokens.accessToken);

      await app.request().delete('/custom/secured/items').set('token', jwt).expect(500);
    });

    it('rejects an encoded path separator', async () => {
      const { jwt, payload } = app.generateUserToken();
      app.mockUserInfo(payload.authTokens.accessToken);

      await app.request().get('/custom/secured/items%2F..%2Fadmin').set('token', jwt).expect(500);
    });

    it('requires the configured authorization header of the matched path and replaces the client one', async () => {
      const first = app.generateUserToken();
      app.mockUserInfo(first.payload.authTokens.accessToken);
      await app.request().post('/custom/secured/items').set('token', first.jwt).send({}).expect(500);

      const second = app.generateUserToken();
      app.mockUserInfo(second.payload.authTokens.accessToken);
      app.nock(CUSTOM_URL).post('/items').matchHeader('authorization', 'Bearer client-secret').reply(201, { created: true });
      await app
        .request()
        .post('/custom/secured/items')
        .set('token', second.jwt)
        .set('Authorization', 'Bearer client-secret')
        .send({ name: 'x' })
        .expect(201);
    });

    it('answers 401 when the user is not in the needed units', async () => {
      const { jwt, payload } = app.generateUserToken();
      app.mockUserInfo(payload.authTokens.accessToken);

      await app
        .request()
        .get('/custom/units-only/items')
        .set('token', jwt)
        .expect(401)
        .expect((response: SupertestResponse) => {
          expect(response.body.error.message).toBe('User without needed units.');
          expect(response.body.error.details).toEqual({ needOneOfUnits: [900] });
        });
    });

    it('lets a user of the needed unit through', async () => {
      const { jwt, payload } = app.generateUserToken('someone-else');
      app.mockUserInfo(payload.authTokens.accessToken, { userId: 'someone-else' });
      await app.sql(`UPDATE units SET members = ARRAY['someone-else', 'test-user-1'] WHERE id = 903`);
      await app.sql(`INSERT INTO units (id, name, members) VALUES (900, 'needed', ARRAY['someone-else'])`);
      app.nock(CUSTOM_URL).get('/items').reply(200, { ok: true });

      await app.request().get('/custom/units-only/items').set('token', jwt).expect(200);
    });
  });

  describe('public custom API', () => {
    it('proxies without authentication, sends null user data and the configured auth header', async () => {
      let received: Record<string, any> = {};
      app
        .nock(ANOTHER_URL)
        .get('/open')
        .reply(200, function () {
          received = this.req.headers;
          return { open: true };
        });

      await app
        .request()
        .get('/custom/public/open')
        .set('token', 'client-own-value')
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body).toEqual({ open: true });
        });

      expect(received['token']).toBe('client-own-value');
      expect(received['authorization']).toBe('Basic cHVibGljOnRlc3Q=');
      expect(received['user-data']).toBe('bnVsbA==');
    });
  });

  describe('JWT-only custom API', () => {
    it('answers 401 for an invalid token', async () => {
      await app.request().get('/custom/jwt-only/check').set('token', 'bad').expect(401);
    });

    it('trusts a fresh JWT without asking ID', async () => {
      const { jwt } = app.generateUserToken();
      app.nock(ANOTHER_URL).get('/check').reply(200, { ok: true });

      await app.request().get('/custom/jwt-only/check').set('token', jwt).expect(200);
    });

    it('checks the session in ID for a stale JWT', async () => {
      const { payload } = app.generateUserToken();
      const jwt = jsonwebtoken.sign({ ...payload, iat: Math.floor(Date.now() / 1000) - 3000 }, JWT_SECRET, { expiresIn: 7200 });
      app.mockUserInfo(payload.authTokens.accessToken);
      app.nock(ANOTHER_URL).get('/check').reply(200, { ok: true });

      await app
        .request()
        .get('/custom/jwt-only/check')
        .set('token', jwt)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.headers).toHaveProperty('new_token');
        });
    });
  });

  describe('invalid configuration', () => {
    it('does not expose a custom API without an allow-list: the request falls to the main proxy', async () => {
      app.nock(TASK_URL).get('/custom/no-allow-list/anything').reply(200, { from: 'task' });

      await app.request().get('/custom/no-allow-list/anything').expect(200, { from: 'task' });
    });

    it('does not expose a custom API that forwards the client token while being authenticated', async () => {
      const { jwt } = app.generateUserToken();
      app.nock(TASK_URL).get('/custom/leaky/leak').reply(200, { from: 'task' });

      await app.request().get('/custom/leaky/leak').set('token', jwt).expect(200, { from: 'task' });
    });
  });
});
