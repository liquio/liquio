import { TestApp } from './test-app';
import { expectAuthRequired } from './helpers/auth_guard';

describe('Favorites Controller', () => {
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

  describe('GET /favorites/:entity_type', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/favorites/:entity_type');
    });
  });

  describe('GET /favorites/:entity_type/:entity_id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/favorites/:entity_type/:entity_id');
    });
  });

  describe('POST /favorites/:entity_type/:entity_id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/favorites/:entity_type/:entity_id');
    });
  });

  describe('DELETE /favorites/:entity_type/:entity_id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'delete', '/favorites/:entity_type/:entity_id');
    });
  });
});
