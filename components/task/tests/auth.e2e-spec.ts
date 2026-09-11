import { TestApp } from './test-app';
import { expectAuthRequired } from './helpers/auth_guard';

describe('Auth Controller', () => {
  let app: TestApp;

  const TEST_USER_ID = '61efddaa351d6219eee09044';

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

  describe('POST /auth/login', () => {
    it('rejects a login attempt with an invalid auth code', async () => {
      // The LiquioId provider is asked to exchange this code for tokens,
      // which fails since there's no real LiquioId server to talk to.
      await app.request().post('/auth/login').send({ code: 'invalid-test-code' }).expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/auth/me');
    });

    it('returns the authenticated user info', async () => {
      const { jwt, payload } = app.generateUserToken(TEST_USER_ID);

      app.nockId.get('/user/info').query({ access_token: payload.authTokens.accessToken }).once().reply(200, {
        userId: TEST_USER_ID,
        role: 'individual',
        services: {},
      });

      await app
        .request()
        .get('/auth/me')
        .set('token', jwt)
        .expect(200)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
        });
    });
  });

  describe('POST /auth/bearer', () => {
    it('rejects a request with no basic auth credentials', async () => {
      await app.request().post('/auth/bearer').expect(401);
    });
  });
});
