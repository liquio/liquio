import { TestApp } from './test-app';

const BASIC_AUTH_TOKEN_RAW = 'cGluZzpwaW5n';
const BASIC_AUTH_TOKEN = `Basic ${BASIC_AUTH_TOKEN_RAW}`;

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

    it('returns only pong and ignores health_check, payment and sign without auth', async () => {
      await app
        .request()
        .get('/test/ping?health_check=true&payment=true&sign=true')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toEqual({ message: 'pong' });
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

    it('returns only pong and ignores health_check without auth', async () => {
      await app
        .request()
        .post('/test/ping?health_check=true')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toEqual({ message: 'pong' });
        });
    });
  });

  describe('/test/ping_with_auth', () => {
    it('requires basic auth credentials', async () => {
      await app.request().get('/test/ping_with_auth?health_check=true').expect(401);
      await app.request().post('/test/ping_with_auth?health_check=true').expect(401);
    });

    it('rejects an unknown basic auth token', async () => {
      await app.request().get('/test/ping_with_auth').set('Authorization', 'Basic d3Jvbmc6d3Jvbmc=').expect(401);
    });

    it('returns pong and processPid when authenticated', async () => {
      global.config.basic_auth.tokens.push(BASIC_AUTH_TOKEN_RAW);

      await app
        .request()
        .get('/test/ping_with_auth')
        .set('Authorization', BASIC_AUTH_TOKEN)
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toMatchObject({ message: 'pong' });
          expect(typeof response.body.data.processPid).toBe('number');
          expect(response.body.data).not.toHaveProperty('authResponse');
        });
    });

    it('returns the dependency flags when authenticated and health_check is requested', async () => {
      global.config.basic_auth.tokens.push(BASIC_AUTH_TOKEN_RAW);

      await app
        .request()
        .get('/test/ping_with_auth?health_check=true')
        .set('Authorization', BASIC_AUTH_TOKEN)
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toMatchObject({ message: 'pong' });
          expect(response.body.data).toHaveProperty('authResponse');
          expect(response.body.data).toHaveProperty('notifyResponse');
          expect(response.body.data).toHaveProperty('registerServiceResponse');
        });
    }, 30000);
  });

  describe('GET /test/ping/services', () => {
    it('requires basic auth credentials', async () => {
      await app.request().get('/test/ping/services').expect(401);
      await app.request().get('/test/ping/services').set('Authorization', 'Basic d3Jvbmc6d3Jvbmc=').expect(401);
    });

    it('returns an aggregated ping response when authenticated', async () => {
      global.config.basic_auth.tokens.push(BASIC_AUTH_TOKEN_RAW);

      await app
        .request()
        .get('/test/ping/services')
        .set('Authorization', BASIC_AUTH_TOKEN)
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toHaveProperty('taskResponse');
        });
    }, 30000);
  });

  describe('GET /test/ping/committed-documents/:document_template_id', () => {
    it('requires basic auth credentials', async () => {
      await app.request().get('/test/ping/committed-documents/placeholder').expect(401);
    });

    it('is routed to a real handler when authenticated', async () => {
      global.config.basic_auth.tokens.push(BASIC_AUTH_TOKEN_RAW);

      // No `ping_documents` config template exists in this environment, so the
      // handler can't do anything useful here beyond proving it's wired up.
      const response = await app.request().get('/test/ping/committed-documents/placeholder').set('Authorization', BASIC_AUTH_TOKEN);
      expect(response.status).not.toBe(404);
      expect(response.status).not.toBe(401);
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
