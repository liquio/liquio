import { TestApp } from './test-app';
import { expectAuthRequired } from './helpers/auth_guard';

describe('Kyc Controller', () => {
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

  describe('POST /kyc/:provider', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/kyc/:provider');
    });
  });

  describe('PUT /kyc/:provider/:id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'put', '/kyc/:provider/:id');
    });
  });

  describe('GET /kyc/:provider/:id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/kyc/:provider/:id');
    });
  });
});
