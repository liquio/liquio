const nock = require('nock');

const { TestApp } = require('./test-app');
const { prepareFixtures } = require('./fixtures');
const AssetsBusiness = require('../src/businesses/assets');

describe('Assets Controller', () => {
  let app;
  let assetsBusiness;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await prepareFixtures(app);

    assetsBusiness = new AssetsBusiness();
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
    assetsBusiness.resetCache();
  });

  describe('GET /assets/to-units', () => {
    it('should fail without auth', async () => {
      await app.request().get('/assets/to-units').expect(401);
    });

    it('should return encrypted data for valid user_ids', async () => {
      const serverToken = global.config.server.token;

      nock('http://eds-service:80').post('/encrypt').matchHeader('token', 'test-sign-token').once().reply(200, { data: 'mocked-encrypted-data' });

      await app
        .request()
        .get('/assets/to-units')
        .set('token', serverToken)
        .query({ user_ids: '61efddaa351d6219eee09043,61efddaa351d6219eee09044' })
        .expect(200)
        .expect((response) => {
          expect(response.body).toBeDefined();
        });
    });

    it('should handle sign service encrypt error', async () => {
      const serverToken = global.config.server.token;

      // Mock sign service encrypt calls to return an error response (not network error)
      nock('http://eds-service:80').post('/encrypt').matchHeader('token', 'test-sign-token').once().reply(500, { error: 'Encryption failed' });

      await app
        .request()
        .get('/assets/to-units')
        .set('token', serverToken)
        .query({ user_ids: '61efddaa351d6219eee09043,61efddaa351d6219eee09044' })
        .expect(500)
        .expect((response) => {
          expect(response.body).toEqual({
            error: { message: '500 - {"error":"Encryption failed"}' },
            traceId: expect.any(String),
          });
        });
    });
  });

  describe('GET /assets/to-registers', () => {
    it('should fail without auth', async () => {
      await app.request().get('/assets/to-registers').expect(401);
    });

    it('should return encrypted data for valid user_ids', async () => {
      const serverToken = global.config.server.token;

      // Mock register service getKeys call
      app
        .nock('http://register:8103')
        .get('/keys?limit=1000000')
        .matchHeader('token', 'Basic cmVnaXN0ZXI6T2FVaVo3MGt1SExq')
        .once()
        .reply(200, { data: [{ id: 1 }, { id: 2 }] });

      // Mock task service getUnitAccess call with proper data wrapper
      app
        .nock('http://task:3000')
        .get('/unit-access?type=register')
        .matchHeader('authorization', 'Basic dGFzazp0YXNr')
        .matchHeader('x-trace-service', 'liquio-admin-api')
        .once()
        .reply(200, {
          data: [
            {
              unitId: '61efddaa351d6219eee09043',
              data: {
                keys: {
                  allowRead: [],
                  allowCreate: [],
                  allowDelete: [],
                  allowUpdate: [],
                },
              },
            },
          ],
        });

      // Mock sign service encrypt calls (with port)
      app.nock('http://eds-service:80').post('/encrypt').matchHeader('token', 'test-sign-token').once().reply(200, { data: 'mocked-encrypted-data' });

      const response = await app
        .request()
        .get('/assets/to-registers')
        .set('token', serverToken)
        .query({ user_ids: '61efddaa351d6219eee09043,61efddaa351d6219eee09044' });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should handle sign service encrypt error', async () => {
      const serverToken = global.config.server.token;

      // Mock register service getKeys call
      app
        .nock('http://register:8103')
        .get('/keys?limit=1000000')
        .matchHeader('token', 'Basic cmVnaXN0ZXI6T2FVaVo3MGt1SExq')
        .once()
        .reply(200, { data: [{ id: 1 }, { id: 2 }] });

      // Mock task service getUnitAccess call with proper data wrapper
      app
        .nock('http://task:3000')
        .get('/unit-access?type=register')
        .matchHeader('authorization', 'Basic dGFzazp0YXNr')
        .matchHeader('x-trace-service', 'liquio-admin-api')
        .once()
        .reply(200, {
          data: [
            {
              unitId: '61efddaa351d6219eee09043',
              data: {
                keys: {
                  allowRead: [],
                  allowCreate: [],
                  allowDelete: [],
                  allowUpdate: [],
                },
              },
            },
          ],
        });

      // Mock sign service encrypt calls to return an error response (not network error)
      app.nock('http://eds-service:80').post('/encrypt').matchHeader('token', 'test-sign-token').reply(500, { error: 'Encryption failed' });

      const response = await app
        .request()
        .get('/assets/to-registers')
        .set('token', serverToken)
        .query({ user_ids: '61efddaa351d6219eee09043,61efddaa351d6219eee09044' });

      expect(response.status).toBe(500);
    });
  });
});
