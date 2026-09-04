import { TestApp } from './test-app';
import { expectAuthRequired } from './helpers/auth_guard';

describe('LocalizationText Controller', () => {
  let app: TestApp;

  const TEST_USER_ID = '61efddaa351d6219eee0904d';

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

  const mockUserAuth = (payload) => {
    app.nockId
      .get('/user/info')
      .query({ access_token: payload.authTokens.accessToken })
      .once()
      .reply(200, { userId: TEST_USER_ID, role: 'individual', services: {} });
  };

  describe('GET /localization-texts', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/localization-texts');
    });

    it('returns a list of localization texts for an authenticated user', async () => {
      const { jwt, payload } = app.generateUserToken(TEST_USER_ID);
      mockUserAuth(payload);

      await app
        .request()
        .get('/localization-texts')
        .set('token', jwt)
        .expect(200)
        .expect((response) => {
          expect(Array.isArray(response.body)).toBe(true);
        });
    });
  });
});
