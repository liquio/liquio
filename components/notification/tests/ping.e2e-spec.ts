import type { Response as SupertestResponse } from 'supertest';

import { TestApp, TEST_AUTH_HEADER } from './test-app';

describe('Test Controller', () => {
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

  describe('GET /test/ping', () => {
    it('should return pong', async () => {
      await app
        .request()
        .get('/test/ping')
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body).toHaveProperty('message', 'pong');
          expect(response.body).toEqual({ message: 'pong' });
        });
    });

    it('should ignore health_check when unauthenticated', async () => {
      await app
        .request()
        .get('/test/ping?health_check=true')
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body).toEqual({ message: 'pong' });
        });
    });
  });

  describe('GET /test/ping_with_auth', () => {
    it('should return 401 without Basic auth', async () => {
      await app.request().get('/test/ping_with_auth').expect(401);
    });

    it('should return pong with Basic auth', async () => {
      await app
        .request()
        .get('/test/ping_with_auth')
        .set('Authorization', TEST_AUTH_HEADER)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body).toHaveProperty('message', 'pong');
        });
    });
  });
});
