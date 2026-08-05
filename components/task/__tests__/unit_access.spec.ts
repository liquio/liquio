import { TestApp } from './test-app';

describe('UnitAccess Controller', () => {
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

  describe('GET /unit-access', () => {
    it('requires basic auth credentials', async () => {
      await app.request().get('/unit-access').expect(401);
    });
  });

  describe('GET /unit-access/:id', () => {
    it('requires basic auth credentials', async () => {
      await app.request().get('/unit-access/placeholder').expect(401);
    });
  });

  describe('POST /unit-access', () => {
    it('requires basic auth credentials', async () => {
      await app.request().post('/unit-access').expect(401);
    });
  });

  describe('PUT /unit-access/:id', () => {
    it('requires basic auth credentials', async () => {
      await app.request().put('/unit-access/placeholder').expect(401);
    });
  });

  describe('DELETE /unit-access/:id', () => {
    it('requires basic auth credentials', async () => {
      await app.request().delete('/unit-access/placeholder').expect(401);
    });
  });
});
