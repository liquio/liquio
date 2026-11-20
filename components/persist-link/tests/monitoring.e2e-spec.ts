// Import.
import { TestApp } from './test_app';

describe('Monitoring (removed system endpoint)', () => {
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

  it('should not expose /monitoring/system', async () => {
    app = await TestApp.setup();

    const response = await app.request().get('/monitoring/system').expect(404);

    expect(response.body).not.toHaveProperty('data.hostname');
    expect(JSON.stringify(response.body)).not.toMatch(/hostname|cpus|osType/);
  });
});
