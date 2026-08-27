import type { Response as SupertestResponse } from 'supertest';

import { TestApp } from './test-app';

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
          expect(response.body.data).toHaveProperty('message', 'pong');
          expect(response.body.data).toHaveProperty('processPid');
          expect(typeof response.body.data.processPid).toBe('number');
        });
    });

    it('should not require auth', async () => {
      await app.request().get('/test/ping').expect(200);
    });

    it('should tolerate the preview service being unreachable when health_check is requested', async () => {
      await app
        .request()
        .get('/test/ping')
        .query({ health_check: 'true' })
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toHaveProperty('message', 'pong');
          expect(response.body.data.previewServiceResponse).toBe(false);
        });

      const [, logData] = await app.log.waitForLog('test-ping-preview-service-error');
      expect(logData.error).toBeDefined();
    });
  });

  describe('GET /test/ping_with_auth', () => {
    it('should require a valid basic auth token', async () => {
      await app.request().get('/test/ping_with_auth').expect(401);
    });

    it('should return pong when a valid token is provided', async () => {
      await app
        .request()
        .get('/test/ping_with_auth')
        .set('Authorization', 'Basic dGVzdDE6dGVzdA==')
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toHaveProperty('message', 'pong');
        });
    });
  });
});
