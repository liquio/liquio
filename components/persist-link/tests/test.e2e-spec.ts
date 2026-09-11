// Import.
import { TestApp, config } from './test_app';

describe('TestController', () => {
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

  it('should construct an application instance without errors', () => {
    app = new TestApp();
    expect(app).toBeDefined();
  });

  it('should initialize models and routes without errors', async () => {
    app = new TestApp();
    await expect(app.init()).resolves.not.toThrow();
  });

  it('should check /test/ping with success', async () => {
    app = await TestApp.setup();

    const response = await app.request().get('/test/ping').expect(200);
    expect(response.body).toEqual({
      data: {
        processPid: expect.any(Number),
        message: 'pong',
      },
    });
  });

  it('should check /test/ping_with_auth with auth failure', async () => {
    app = await TestApp.setup();

    const response = await app.request().get('/test/ping_with_auth').expect(401);
    expect(response.body).toEqual({
      error: {
        message: 'Incorrect basic auth token.',
      },
    });
  });

  it('should check /test/ping_with_auth with auth success', async () => {
    app = await TestApp.setup();

    const token = 'persist-link-test-token';
    config.auth.tokens = [token];

    const response = await app.request().get('/test/ping_with_auth').set('token', token).expect(200);
    expect(response.body).toEqual({
      data: {
        processPid: expect.any(Number),
        message: 'pong',
      },
    });
  });
});
