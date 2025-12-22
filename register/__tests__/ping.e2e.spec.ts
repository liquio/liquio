import { TestHarness } from './test-harness';

describe('RegistersController', () => {
  let testHarness: TestHarness;

  beforeAll(async () => {
    testHarness = new TestHarness();
    await testHarness.setup({ useDatabase: true });
  }, 30000);

  afterAll(async () => {
    await testHarness.teardown();
  });

  describe('GET /test/ping', () => {
    it('should return pong', async () => {
      await testHarness
        .request()
        .get('/test/ping')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toEqual({
            data: { message: 'pong', processPid: expect.any(Number) }
          });
        });
    });
  });

  describe('GET /test/ping_with_auth', () => {
    it('should return pong with valid authentication', async () => {
      await testHarness
        .request()
        .get('/test/ping_with_auth')
        .set('Authorization', 'Basic dGVzdDp0ZXN0')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toEqual({
            data: { message: 'pong', processPid: expect.any(Number) }
          });
        });
    });

    it('should return 401 without authentication', async () => {
      await testHarness
        .request()
        .get('/test/ping_with_auth')
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('message');
        });
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness
        .request()
        .get('/test/ping_with_auth')
        .set('Authorization', 'Basic aW52YWxpZDppbnZhbGlk')
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('message');
        });
    });
  });
});
