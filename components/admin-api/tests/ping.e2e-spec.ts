import type { Response as SupertestResponse } from 'supertest';

import { TestApp } from './test-app';
import { prepareFixtures } from './fixtures';

const TEST_USER_ID = '61efddaa351d6219eee09043';

describe('Ping Controller', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();

    // Insert fixture data into the database
    await prepareFixtures(app);
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

  describe('GET /test/ping', () => {
    it('should return only pong without health check', async () => {
      await app
        .request()
        .get('/test/ping')
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual({ message: 'pong' });
        });
    });

    it('should ignore health_check without auth and not reveal internal status', async () => {
      await app
        .request()
        .get('/test/ping?health_check=true')
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual({ message: 'pong' });
        });
    });
  });

  describe('GET /test/ping_with_auth', () => {
    const mockAuth = (payload: { authTokens: { accessToken: string } }) => {
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, { userId: TEST_USER_ID, role: 'admin', services: { eds: { data: { pem: 'PEM' } } } });
    };

    it('should require authentication', async () => {
      await app.request().get('/test/ping_with_auth?health_check=true').expect(401);
    });

    it('should return pong and processPid for an admin', async () => {
      const { jwt, payload } = app.generateUserToken(TEST_USER_ID);
      mockAuth(payload);

      await app
        .request()
        .get('/test/ping_with_auth')
        .set('token', jwt)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toHaveProperty('message', 'pong');
          expect(typeof response.body.data.processPid).toBe('number');
        });
    });

    it('should return dependency flags for an admin when health_check is requested', async () => {
      const { jwt, payload } = app.generateUserToken(TEST_USER_ID);
      mockAuth(payload);

      await app
        .request()
        .get('/test/ping_with_auth?health_check=true')
        .set('token', jwt)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toHaveProperty('message', 'pong');
          expect(response.body.data).toHaveProperty('authServiceResponse');
          expect(response.body.data).toHaveProperty('registerServiceResponse');
          expect(response.body.data).toHaveProperty('taskServiceResponse');
          expect(response.body.data).toHaveProperty('notifyServiceResponse');
        });
    });
  });
});
