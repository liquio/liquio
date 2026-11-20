import { TestApp } from './test-app';
import { expectAuthRequired } from './helpers/auth_guard';

describe('WorkflowLog Controller', () => {
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

  describe('GET /workflow-logs/:id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/workflow-logs/:id');
    });
  });

  describe('GET /external_services/workflow-logs/workflows-by-updated-at', () => {
    it('requires basic auth credentials', async () => {
      await app.request().get('/external_services/workflow-logs/workflows-by-updated-at').expect(401);
    });
  });

  describe('GET /external_services/workflow-logs/workflows', () => {
    it('requires basic auth credentials', async () => {
      await app.request().get('/external_services/workflow-logs/workflows').expect(401);
    });
  });

  describe('GET /external_services/workflow-logs/:id', () => {
    it('requires basic auth credentials', async () => {
      await app.request().get('/external_services/workflow-logs/placeholder').expect(401);
    });
  });
});
