import { TestApp } from './test-app';
import { expectAuthRequired } from './helpers/auth_guard';

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

  describe('GET /monitor/system', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/monitor/system');
    });
  });
});
