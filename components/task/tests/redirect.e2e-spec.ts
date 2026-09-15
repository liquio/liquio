import { TestApp } from './test-app';

describe('Redirect Controller', () => {
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

  describe('GET /redirect/auth', () => {
    it('redirects to the LiquioId auth endpoint', async () => {
      const response = await app.request().get('/redirect/auth');
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain(global.config.auth.LiquioId.routes.getCode);
    });
  });

  describe('GET /redirect/logout', () => {
    it('redirects to the LiquioId logout endpoint', async () => {
      const response = await app.request().get('/redirect/logout');
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain(global.config.auth.LiquioId.routes.logout);
    });
  });
});
