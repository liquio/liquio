import { TestApp, config } from './test_app';

describe('TestController', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
  });

  afterAll(async () => {
    await app.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  afterEach(async () => {
    await app.destroy();
  });

  it('should construct an application instance without errors', () => {
    app = new TestApp();
    expect(app).toBeDefined();
  });

  it('should initialize models, services, middlewares without errors', async () => {
    app = new TestApp();
    await expect(app.init()).resolves.not.toThrow();
  });

  it('should check /test/ping with success', async () => {
    app = await TestApp.setup();

    const response = await app.request().get('/test/ping').expect(200);
    expect(response.body).toEqual({ processPid: expect.any(Number), message: 'pong' });
  });

  it('should check /test/ping with health_check with success', async () => {
    app = await TestApp.setup();

    const response = await app.request().get('/test/ping?health_check=true').expect(200);
    expect(response.body).toEqual({
      processPid: expect.any(Number),
      message: 'pong',
      correctNotifyConnection: expect.any(String),
      correctEdsConnection: expect.any(String),
    });
  });

  it('should check /test/ping_with_auth with auth failure', async () => {
    app = await TestApp.setup();

    const response = await app.request().get('/test/ping_with_auth').expect(401);
    expect(response.body).toEqual({});
  });

  it('should check /test/ping_with_auth with auth success', async () => {
    app = await TestApp.setup();

    const login = 'admin';
    const password = 'admin';

    config.oauth!.secret_key = [Buffer.from(`${login}:${password}`).toString('base64')];

    const response = await app.request().get('/test/ping_with_auth').auth(login, password).expect(200);
    expect(response.body).toEqual({ processPid: expect.any(Number), message: 'pong' });
  });
});
