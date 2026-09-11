import { TestApp } from './test-app';

describe('Ping Controller', () => {
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

  describe('GET /test/ping', () => {
    it('returns a pong message', async () => {
      await app
        .request()
        .get('/test/ping')
        .expect(200)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toMatchObject({ message: 'pong' });
        });
    });
  });

  describe('POST /test/ping', () => {
    it('returns a pong message', async () => {
      await app
        .request()
        .post('/test/ping')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toMatchObject({ message: 'pong' });
        });
    });
  });

  describe('GET /test/ping/services', () => {
    it('returns an aggregated ping response', async () => {
      await app
        .request()
        .get('/test/ping/services')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toHaveProperty('taskResponse');
        });
    }, 30000);
  });

  describe('GET /test/ping/committed-documents/:document_template_id', () => {
    it('is routed to a real handler', async () => {
      // No `ping_documents` config template exists in this environment, so the
      // handler can't do anything useful here beyond proving it's wired up.
      const response = await app.request().get('/test/ping/committed-documents/placeholder');
      expect(response.status).not.toBe(404);
    });
  });

  describe('GET /healthz', () => {
    it('returns ok status', async () => {
      await app
        .request()
        .get('/healthz')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toEqual({ status: 'ok' });
        });
    });
  });
});
