import type { Response as SupertestResponse } from 'supertest';

import { TestApp } from './test-app';

describe('Ping Controller', () => {
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
          expect(response.body.data).toHaveProperty('message', 'pong');
          expect(response.body.data).toHaveProperty('processPid');
          expect(typeof response.body.data.processPid).toBe('number');
        });
    });
  });

  describe('GET /healthz', () => {
    it('should return ok when the database check passes', async () => {
      await app
        .request()
        .get('/healthz')
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toHaveProperty('status', 'ok');
        });
    });
  });
});
