import type { Response as SupertestResponse } from 'supertest';

import { TestApp } from './test-app';

describe('Monitor Controller', () => {
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

  describe('GET /monitors/system', () => {
    it('should return system info', async () => {
      await app
        .request()
        .get('/monitors/system')
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toHaveProperty('hostname');
          expect(response.body.data).toHaveProperty('osType');
          expect(response.body.data).toHaveProperty('osPlatform');
          expect(response.body.data).toHaveProperty('arch');
          expect(response.body.data).toHaveProperty('uptimeSec');
          expect(response.body.data).toHaveProperty('loadAvg');
          expect(response.body.data).toHaveProperty('totalMemGb');
          expect(response.body.data).toHaveProperty('freeMemGb');
          expect(response.body.data).toHaveProperty('cpus');
        });
    });
  });
});
