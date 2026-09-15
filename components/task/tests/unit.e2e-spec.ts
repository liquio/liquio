import { TestApp } from './test-app';
import { expectAuthRequired } from './helpers/auth_guard';

describe('Unit Controller', () => {
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

  describe('GET /units', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/units');
    });
  });

  describe('GET /units/:id', () => {
    it('requires basic auth credentials', async () => {
      await app.request().get('/units/placeholder').expect(401);
    });
  });

  describe('GET /units/:id/as-head', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/units/:id/as-head');
    });
  });

  describe('POST /units/participants-as-head', () => {
    it('requires basic auth credentials', async () => {
      await app.request().post('/units/participants-as-head').expect(401);
    });
  });

  describe('POST /units/:id/requested-members', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/units/:id/requested-members');
    });
  });

  describe('DELETE /units/:id/members', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'delete', '/units/:id/members');
    });
  });
});
