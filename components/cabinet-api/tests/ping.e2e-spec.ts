import type { Response as SupertestResponse } from 'supertest';

import { TestApp } from './test-app';

describe('Ping', () => {
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

  afterEach(async () => {
    await TestApp.afterEach();
  });

  it('GET /test/ping answers pong with identification headers', async () => {
    await app
      .request()
      .get('/test/ping')
      .expect(200)
      .expect((response: SupertestResponse) => {
        expect(response.body.data.message).toBe('pong');
        expect(typeof response.body.data.processPid).toBe('number');
        expect(response.headers).toHaveProperty('name');
        expect(response.headers).toHaveProperty('version');
        expect(response.headers.customer).toBe('liquio');
        expect(response.headers.environment).toBe('dev');
      });
  });

  it('sets CORS headers', async () => {
    await app
      .request()
      .get('/test/ping')
      .set('Origin', 'http://front.test')
      .expect(200)
      .expect((response: SupertestResponse) => {
        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.headers['access-control-expose-headers']).toContain('new_token');
      });
  });
});
