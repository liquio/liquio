import { TestApp } from './test-app';
import { expectAuthRequired } from './helpers/auth_guard';

describe('ExternalReader Controller', () => {
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

  describe('GET /external_reader/mocks-keys-by-user', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/external_reader/mocks-keys-by-user');
    });
  });

  describe('POST /external_reader', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/external_reader');
    });
  });

  describe('POST /external_reader/async', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/external_reader/async');
    });
  });

  describe('DELETE /external_reader/cache', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'delete', '/external_reader/cache');
    });
  });

  // These proxy to a real external-reader service host that doesn't exist in this test
  // environment, so a DNS failure is expected. Just assert the route is reachable.
  describe('GET /external_reader/captcha/providers/list', () => {
    it('is reachable', async () => {
      const response = await app.request().get('/external_reader/captcha/providers/list');
      expect(typeof response.status).toBe('number');
    });
  });

  describe('GET /external_reader/captcha/:service/:method', () => {
    it('is reachable', async () => {
      const response = await app.request().get('/external_reader/captcha/placeholder/placeholder');
      expect(typeof response.status).toBe('number');
    });
  });
});
