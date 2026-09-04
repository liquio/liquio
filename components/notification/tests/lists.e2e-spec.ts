import type { Response as SupertestResponse } from 'supertest';

import { TestApp } from './test-app';

describe('Lists Controller', () => {
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

  describe('GET /eventsAndTransports', () => {
    it('round-trips through the real database and returns an empty list on a fresh schema', async () => {
      await app
        .request()
        .get('/eventsAndTransports')
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body).toHaveLength(0);
        });
    });
  });
});
