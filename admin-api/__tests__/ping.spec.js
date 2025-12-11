const { TestApp } = require('./test-app');
const { prepareFixtures } = require('./fixtures');

describe('Ping Controller', () => {
  let app;

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
    it('should return pong without health check', async () => {
      await app
        .request()
        .get('/test/ping')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toHaveProperty('message', 'pong');
          expect(response.body.data).toHaveProperty('processPid');
          expect(typeof response.body.data.processPid).toBe('number');
        });
    });

    it('should return pong with health check but ignore health check without auth', async () => {
      await app
        .request()
        .get('/test/ping?health_check=true')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toHaveProperty('message', 'pong');
          expect(response.body.data).toHaveProperty('processPid');
          expect(typeof response.body.data.processPid).toBe('number');
        });
    });
  });
});
