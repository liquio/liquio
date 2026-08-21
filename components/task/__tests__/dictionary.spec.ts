import { TestApp } from './test-app';

describe('Dictionary Controller', () => {
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

  describe('GET /dictionaries', () => {
    it('returns all dictionaries', async () => {
      await app
        .request()
        .get('/dictionaries')
        .expect(200)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
        });
    });
  });

  describe('GET /dictionaries/:name', () => {
    it('returns 404 for an unknown dictionary name', async () => {
      await app
        .request()
        .get('/dictionaries/does-not-exist')
        .expect(404)
        .expect((response) => {
          expect(response.body.error.message).toContain('doesn\'t exist');
        });
    });
  });
});
