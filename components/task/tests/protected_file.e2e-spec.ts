import { TestApp } from './test-app';
import { expectAuthRequired } from './helpers/auth_guard';

describe('ProtectedFile Controller', () => {
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

  describe('POST /protected-files', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/protected-files');
    });
  });

  describe('GET /protected-files/keys/:key_id/records/:record_id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/protected-files/keys/:key_id/records/:record_id');
    });
  });
});
