// Import.
import { TestApp } from './test_app';

describe('MonitoringController', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
  });

  afterAll(async () => {
    if (app) {
      await app.destroy();
    }
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  afterEach(async () => {
    if (app) {
      await app.destroy();
    }
  });

  it('should check /monitoring/system with success', async () => {
    app = await TestApp.setup();

    const response = await app.request().get('/monitoring/system').expect(200);

    expect(response.body).toEqual({
      data: {
        hostname: expect.any(String),
        osType: expect.any(String),
        osPlatform: expect.any(String),
        arch: expect.any(String),
        release: expect.any(String),
        uptimeSec: expect.any(String),
        loadAvg: expect.any(Array),
        totalMemGb: expect.any(String),
        freeMemGb: expect.any(String),
        cpus: expect.any(Array),
      },
    });

    expect(response.body.data.loadAvg).toHaveLength(3);
  });
});
