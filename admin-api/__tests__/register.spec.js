const nock = require('nock');

const { TestApp } = require('./test-app');
const { prepareFixtures } = require('./fixtures');

describe('Register Controller', () => {
  let app;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();

    // Insert fixture data into the database
    await prepareFixtures(app);
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

  describe('GET /registers', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().get('/registers').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should return registers with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call
      app
        .nock('http://register:8103')
        .get('/registers')
        .query(true) // Accept any query parameters
        .once()
        .reply(200, {
          data: [
            {
              id: 1,
              name: 'Test Register',
              description: 'Test Description',
              createdAt: '2023-01-01T00:00:00.000Z',
              updatedAt: '2023-01-01T00:00:00.000Z',
            },
          ],
          meta: {
            count: 1,
            offset: 0,
            limit: 20,
          },
        });

      const response = await app.request().get('/registers').set('token', jwt).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('meta');
    });
  });

  describe('GET /registers/all', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().get('/registers/all').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should return all registers with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for /registers/all
      app
        .nock('http://register:8103')
        .get('/registers')
        .query(true) // Accept any query parameters
        .once()
        .reply(200, {
          data: [
            {
              id: 1,
              name: 'Test Register 1',
              description: 'Test Description 1',
              createdAt: '2023-01-01T00:00:00.000Z',
              updatedAt: '2023-01-01T00:00:00.000Z',
            },
            {
              id: 2,
              name: 'Test Register 2',
              description: 'Test Description 2',
              createdAt: '2023-01-02T00:00:00.000Z',
              updatedAt: '2023-01-02T00:00:00.000Z',
            },
          ],
        });

      const response = await app.request().get('/registers/all').set('token', jwt).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('POST /registers', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().post('/registers').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should create a register with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for POST /registers
      app
        .nock('http://register:8103')
        .post('/registers')
        .once()
        .reply(200, {
          data: {
            id: 3,
            name: 'New Test Register',
            description: 'New Test Description',
            createdAt: '2023-01-03T00:00:00.000Z',
            updatedAt: '2023-01-03T00:00:00.000Z',
          },
        });

      const requestBody = {
        name: 'New Test Register',
        description: 'New Test Description',
      };

      const response = await app.request().post('/registers').set('token', jwt).send(requestBody).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('New Test Register');
      expect(response.body.data.description).toBe('New Test Description');
    });
  });

  describe('GET /registers/:id', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().get('/registers/1').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should return a register with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /registers/:id
      app
        .nock('http://register:8103')
        .get('/registers/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            name: 'Test Register',
            description: 'Test Description',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
          },
        });

      const response = await app.request().get('/registers/1').set('token', jwt).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data.name).toBe('Test Register');
      expect(response.body.data.description).toBe('Test Description');
    });

    it('should return empty data when register not found', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /registers/:id (not found)
      app
        .nock('http://register:8103')
        .get('/registers/999')
        .once()
        .reply(404, {
          error: {
            message: 'Not found.',
          },
        });

      const response = await app.request().get('/registers/999').set('token', jwt).expect(200);

      expect(response.body).toEqual({ data: {} });
    });
  });

  describe('PUT /registers/:id', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().put('/registers/1').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should update a register with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /registers/:id (to check if exists)
      app
        .nock('http://register:8103')
        .get('/registers/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            name: 'Original Test Register',
            description: 'Original Test Description',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
          },
        });

      // Mock register service call for PUT /registers/:id
      app
        .nock('http://register:8103')
        .put('/registers/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            name: 'Updated Test Register',
            description: 'Updated Test Description',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T12:00:00.000Z',
          },
        });

      const requestBody = {
        name: 'Updated Test Register',
        description: 'Updated Test Description',
      };

      const response = await app.request().put('/registers/1').set('token', jwt).send(requestBody).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data.name).toBe('Updated Test Register');
      expect(response.body.data.description).toBe('Updated Test Description');
    });

    it('should return error when trying to update a register that does not exist', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /registers/:id (not found)
      app
        .nock('http://register:8103')
        .get('/registers/999')
        .once()
        .reply(404, {
          error: {
            message: 'Not found.',
          },
        });

      const requestBody = {
        name: 'Updated Test Register',
        description: 'Updated Test Description',
      };

      const response = await app.request().put('/registers/999').set('token', jwt).send(requestBody).expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('traceId');
    });
  });

  describe('DELETE /registers/:id', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().delete('/registers/1').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should delete a register with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for DELETE /registers/:id
      app
        .nock('http://register:8103')
        .delete('/registers/1')
        .once()
        .reply(200, {
          data: {
            message: 'Register deleted successfully',
          },
        });

      const response = await app.request().delete('/registers/1').set('token', jwt).expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should return empty data when trying to delete a register that does not exist', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for DELETE /registers/:id (not found)
      app
        .nock('http://register:8103')
        .delete('/registers/999')
        .once()
        .reply(404, {
          error: {
            message: 'Not found.',
          },
        });

      const response = await app.request().delete('/registers/999').set('token', jwt).expect(200);

      expect(response.body).toEqual({ data: {} });
    });
  });

  describe('GET /registers/keys', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().get('/registers/keys').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should return register keys with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /registers/keys
      app
        .nock('http://register:8103')
        .get('/keys')
        .query(true) // Accept any query parameters
        .once()
        .reply(200, {
          data: [
            {
              id: 1,
              registerId: 1,
              name: 'Test Key 1',
              description: 'Test Key Description 1',
              createdAt: '2023-01-01T00:00:00.000Z',
              updatedAt: '2023-01-01T00:00:00.000Z',
            },
            {
              id: 2,
              registerId: 1,
              name: 'Test Key 2',
              description: 'Test Key Description 2',
              createdAt: '2023-01-02T00:00:00.000Z',
              updatedAt: '2023-01-02T00:00:00.000Z',
            },
          ],
          meta: {
            count: 2,
            offset: 0,
            limit: 20,
          },
        });

      const response = await app.request().get('/registers/keys').set('token', jwt).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body).toHaveProperty('meta');
    });
  });

  describe('GET /registers/keys/all', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().get('/registers/keys/all').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should return all register keys with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /registers/keys/all
      app
        .nock('http://register:8103')
        .get('/keys')
        .query(true) // Accept any query parameters
        .once()
        .reply(200, {
          data: [
            {
              id: 1,
              registerId: 1,
              name: 'Test Key 1',
              description: 'Test Key Description 1',
              createdAt: '2023-01-01T00:00:00.000Z',
              updatedAt: '2023-01-01T00:00:00.000Z',
            },
            {
              id: 2,
              registerId: 1,
              name: 'Test Key 2',
              description: 'Test Key Description 2',
              createdAt: '2023-01-02T00:00:00.000Z',
              updatedAt: '2023-01-02T00:00:00.000Z',
            },
            {
              id: 3,
              registerId: 2,
              name: 'Test Key 3',
              description: 'Test Key Description 3',
              createdAt: '2023-01-03T00:00:00.000Z',
              updatedAt: '2023-01-03T00:00:00.000Z',
            },
          ],
        });

      const response = await app.request().get('/registers/keys/all').set('token', jwt).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });
  });

  describe('GET /registers/keys/synced', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().get('/registers/keys/synced').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should return synced register keys with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /registers/keys/synced
      app
        .nock('http://register:8103')
        .get('/keys/synced')
        .query({ ids: '1,2' }) // Required query parameter
        .once()
        .reply(200, {
          data: [
            {
              id: 1,
              registerId: 1,
              name: 'Synced Key 1',
              description: 'Synced Key Description 1',
              syncStatus: 'synced',
              lastSyncAt: '2023-01-01T12:00:00.000Z',
              createdAt: '2023-01-01T00:00:00.000Z',
              updatedAt: '2023-01-01T12:00:00.000Z',
            },
            {
              id: 2,
              registerId: 2,
              name: 'Synced Key 2',
              description: 'Synced Key Description 2',
              syncStatus: 'synced',
              lastSyncAt: '2023-01-02T12:00:00.000Z',
              createdAt: '2023-01-02T00:00:00.000Z',
              updatedAt: '2023-01-02T12:00:00.000Z',
            },
          ],
        });

      const response = await app
        .request()
        .get('/registers/keys/synced?ids=1,2') // Add required query parameter
        .set('token', jwt)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('syncStatus', 'synced');
      expect(response.body.data[0]).toHaveProperty('lastSyncAt');
    });
  });

  describe('GET /registers/keys/synced/all', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().get('/registers/keys/synced/all').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should return all synced register keys with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /registers/keys/synced/all
      app
        .nock('http://register:8103')
        .get('/keys/allSynced')
        .once()
        .reply(200, {
          data: [
            {
              id: 1,
              registerId: 1,
              name: 'All Synced Key 1',
              description: 'All Synced Key Description 1',
              syncStatus: 'synced',
              lastSyncAt: '2023-01-01T12:00:00.000Z',
              createdAt: '2023-01-01T00:00:00.000Z',
              updatedAt: '2023-01-01T12:00:00.000Z',
            },
            {
              id: 2,
              registerId: 1,
              name: 'All Synced Key 2',
              description: 'All Synced Key Description 2',
              syncStatus: 'synced',
              lastSyncAt: '2023-01-02T12:00:00.000Z',
              createdAt: '2023-01-02T00:00:00.000Z',
              updatedAt: '2023-01-02T12:00:00.000Z',
            },
            {
              id: 3,
              registerId: 2,
              name: 'All Synced Key 3',
              description: 'All Synced Key Description 3',
              syncStatus: 'synced',
              lastSyncAt: '2023-01-03T12:00:00.000Z',
              createdAt: '2023-01-03T00:00:00.000Z',
              updatedAt: '2023-01-03T12:00:00.000Z',
            },
          ],
        });

      const response = await app.request().get('/registers/keys/synced/all').set('token', jwt).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toHaveProperty('syncStatus', 'synced');
      expect(response.body.data[0]).toHaveProperty('lastSyncAt');
    });
  });

  describe('GET /registers/keys/:key_id', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().get('/registers/keys/1').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should return a register key with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /registers/keys/:key_id
      app
        .nock('http://register:8103')
        .get('/keys/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            registerId: 1,
            name: 'Test Key 1',
            description: 'Test Key Description 1',
            type: 'string',
            required: true,
            unique: false,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
          },
        });

      const response = await app.request().get('/registers/keys/1').set('token', jwt).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('registerId', 1);
      expect(response.body.data.name).toBe('Test Key 1');
      expect(response.body.data.description).toBe('Test Key Description 1');
      expect(response.body.data).toHaveProperty('type');
      expect(response.body.data).toHaveProperty('required');
    });
  });

  describe('POST /registers/keys', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().post('/registers/keys').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should create a register key with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /registers/:id (to validate register exists)
      app
        .nock('http://register:8103')
        .get('/registers/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            name: 'Test Register',
            description: 'Test Description',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
          },
        });

      // Mock register service call for PUT /registers/:id (to update register with updatedByPerson)
      app
        .nock('http://register:8103')
        .put('/registers/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            name: 'Test Register',
            description: 'Test Description',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            meta: {
              updatedByPerson: {
                userId: '61efddaa351d6219eee09043',
                name: '',
              },
            },
          },
        });

      // Mock task service call for deleting register cache
      app
        .nock('http://task:3000')
        .delete('/register/cache')
        .once()
        .reply(200, { data: { success: true } });

      // Mock register service call for POST /registers/keys
      app
        .nock('http://register:8103')
        .post('/keys')
        .once()
        .reply(200, {
          data: {
            id: 4,
            registerId: 1,
            name: 'New Test Key',
            description: 'New Test Key Description',
            type: 'string',
            required: false,
            unique: false,
            schema: {
              type: 'string',
              maxLength: 255,
            },
            createdAt: '2023-01-04T00:00:00.000Z',
            updatedAt: '2023-01-04T00:00:00.000Z',
          },
        });

      const requestBody = {
        registerId: 1,
        name: 'New Test Key',
        description: 'New Test Key Description',
        schema: {
          type: 'string',
          maxLength: 255,
        },
        toString: 'string representation',
      };

      const response = await app.request().post('/registers/keys').set('token', jwt).send(requestBody);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('registerId', 1);
      expect(response.body.data.name).toBe('New Test Key');
      expect(response.body.data.description).toBe('New Test Key Description');
      expect(response.body.data).toHaveProperty('schema');
      expect(response.body.data.schema).toHaveProperty('type', 'string');
    });
  });

  describe('PUT /registers/keys/:key_id', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().put('/registers/keys/1').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should update a register key with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /registers/:id (to validate register exists)
      app
        .nock('http://register:8103')
        .get('/registers/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            name: 'Test Register',
            description: 'Test Description',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            meta: {
              createdByPerson: {
                userId: '61efddaa351d6219eee09043',
                name: '',
              },
            },
          },
        });

      // Mock register service call for PUT /registers/:id (to update register with updatedByPerson)
      app
        .nock('http://register:8103')
        .put('/registers/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            name: 'Test Register',
            description: 'Test Description',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            meta: {
              createdByPerson: {
                userId: '61efddaa351d6219eee09043',
                name: '',
              },
              updatedByPerson: {
                userId: '61efddaa351d6219eee09043',
                name: '',
              },
            },
          },
        });

      // Mock register service call for GET /keys/:key_id (to get current key state)
      app
        .nock('http://register:8103')
        .get('/keys/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            registerId: 1,
            name: 'Original Key Name',
            description: 'Original Key Description',
            type: 'string',
            required: false,
            unique: false,
            schema: {
              type: 'string',
              maxLength: 100,
            },
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            meta: {
              createdByPerson: {
                userId: '61efddaa351d6219eee09043',
                name: '',
              },
            },
          },
        });

      // Mock register service call for PUT /keys/:key_id (to update the key)
      app
        .nock('http://register:8103')
        .put('/keys/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            registerId: 1,
            name: 'Updated Key Name',
            description: 'Updated Key Description',
            type: 'string',
            required: true,
            unique: false,
            schema: {
              type: 'string',
              maxLength: 200,
            },
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T12:00:00.000Z',
            meta: {
              createdByPerson: {
                userId: '61efddaa351d6219eee09043',
                name: '',
              },
              updatedByPerson: {
                userId: '61efddaa351d6219eee09043',
                name: '',
              },
            },
          },
        });

      // Mock task service call for deleting register cache
      app
        .nock('http://task:3000')
        .delete('/register/cache')
        .once()
        .reply(200, { data: { success: true } });

      const requestBody = {
        registerId: 1,
        name: 'Updated Key Name',
        description: 'Updated Key Description',
        type: 'string',
        required: true,
        schema: {
          type: 'string',
          maxLength: 200,
        },
        toString: 'string representation',
      };

      const response = await app.request().put('/registers/keys/1').set('token', jwt).send(requestBody).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('registerId', 1);
      expect(response.body.data.name).toBe('Updated Key Name');
      expect(response.body.data.description).toBe('Updated Key Description');
      expect(response.body.data).toHaveProperty('required', true);
      expect(response.body.data).toHaveProperty('schema');
      expect(response.body.data.schema).toHaveProperty('maxLength', 200);
    });
  });

  describe('DELETE /registers/keys/:key_id', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().delete('/registers/keys/1').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should delete a register key with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /keys/:key_id (to get current key state)
      app
        .nock('http://register:8103')
        .get('/keys/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            registerId: 1,
            name: 'Key to Delete',
            description: 'Key Description',
            type: 'string',
            required: false,
            unique: false,
            schema: {
              type: 'string',
              maxLength: 100,
            },
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            meta: {
              createdByPerson: {
                userId: '61efddaa351d6219eee09043',
                name: '',
              },
            },
          },
        });

      // Mock register service call for GET /registers/:id (to validate register exists)
      app
        .nock('http://register:8103')
        .get('/registers/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            name: 'Test Register',
            description: 'Test Description',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            meta: {
              createdByPerson: {
                userId: '61efddaa351d6219eee09043',
                name: '',
              },
            },
          },
        });

      // Mock register service call for PUT /registers/:id (to update register with updatedByPerson)
      app
        .nock('http://register:8103')
        .put('/registers/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            name: 'Test Register',
            description: 'Test Description',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            meta: {
              createdByPerson: {
                userId: '61efddaa351d6219eee09043',
                name: '',
              },
              updatedByPerson: {
                userId: '61efddaa351d6219eee09043',
                name: '',
              },
            },
          },
        });

      // Mock register service call for DELETE /keys/:key_id (to delete the key)
      app
        .nock('http://register:8103')
        .delete('/keys/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            registerId: 1,
            name: 'Key to Delete',
            description: 'Key Description',
            deleted: true,
            deletedAt: '2023-01-01T12:00:00.000Z',
          },
        });

      // Mock task service call for deleting register cache
      app
        .nock('http://task:3000')
        .delete('/register/cache')
        .once()
        .reply(200, { data: { success: true } });

      const response = await app.request().delete('/registers/keys/1').set('token', jwt).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('registerId', 1);
      expect(response.body.data.name).toBe('Key to Delete');
      expect(response.body.data).toHaveProperty('deleted', true);
      expect(response.body.data).toHaveProperty('deletedAt');
    });
  });

  describe('PUT /registers/keys/:key_id/mapping', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().put('/registers/keys/1/mapping').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should update key mapping with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for PUT /keys/:key_id/mapping
      app
        .nock('http://register:8103')
        .put('/keys/1/mapping')
        .once()
        .reply(200, {
          data: {
            id: 1,
            registerId: 1,
            name: 'Test Key',
            description: 'Test Key Description',
            type: 'string',
            mapping: {
              properties: {
                title: {
                  type: 'text',
                  analyzer: 'standard',
                },
                description: {
                  type: 'text',
                  analyzer: 'standard',
                },
                timestamp: {
                  type: 'date',
                },
              },
            },
            updatedAt: '2023-01-01T12:00:00.000Z',
          },
        });

      const requestBody = {
        mapping: JSON.stringify({
          properties: {
            title: {
              type: 'text',
              analyzer: 'standard',
            },
            description: {
              type: 'text',
              analyzer: 'standard',
            },
            timestamp: {
              type: 'date',
            },
          },
        }),
      };

      const response = await app.request().put('/registers/keys/1/mapping').set('token', jwt).send(requestBody).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('registerId', 1);
      expect(response.body.data.name).toBe('Test Key');
      expect(response.body.data).toHaveProperty('mapping');
      expect(response.body.data.mapping).toHaveProperty('properties');
      expect(response.body.data.mapping.properties).toHaveProperty('title');
      expect(response.body.data.mapping.properties).toHaveProperty('description');
      expect(response.body.data.mapping.properties).toHaveProperty('timestamp');
    });
  });

  describe('POST /registers/keys/:key_id/reindex', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().post('/registers/keys/1/reindex').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should reindex key with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for POST /keys/:key_id/reindex
      app
        .nock('http://register:8103')
        .post('/keys/1/reindex')
        .once()
        .reply(200, {
          data: {
            id: 1,
            registerId: 1,
            name: 'Test Key',
            description: 'Test Key Description',
            type: 'string',
            reindexStatus: 'completed',
            reindexedAt: '2023-01-01T12:00:00.000Z',
            indexedRecords: 1500,
            processingTime: '2.3s',
          },
        });

      const response = await app.request().post('/registers/keys/1/reindex').set('token', jwt).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('registerId', 1);
      expect(response.body.data.name).toBe('Test Key');
      expect(response.body.data).toHaveProperty('reindexStatus', 'completed');
      expect(response.body.data).toHaveProperty('reindexedAt');
      expect(response.body.data).toHaveProperty('indexedRecords', 1500);
      expect(response.body.data).toHaveProperty('processingTime');
    });
  });

  describe('POST /registers/keys/:key_id/afterhandlers-reindex', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().post('/registers/keys/1/afterhandlers-reindex').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should perform after handlers reindex with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for POST /keys/:key_id/afterhandlers-reindex
      app
        .nock('http://register:8103')
        .post('/keys/1/afterhandlers-reindex')
        .once()
        .reply(200, {
          data: {
            id: 1,
            registerId: 1,
            name: 'Test Key',
            description: 'Test Key Description',
            type: 'string',
            afterHandlersReindexStatus: 'completed',
            reindexedAt: '2023-01-01T12:00:00.000Z',
            processedMappings: 5,
            appliedSettings: {
              analysis: {
                analyzer: {
                  custom_analyzer: {
                    type: 'standard',
                    stopwords: '_english_',
                  },
                },
              },
            },
            processingTime: '1.8s',
          },
        });

      const requestBody = {
        mappings: {
          properties: {
            title: {
              type: 'text',
              analyzer: 'custom_analyzer',
            },
            content: {
              type: 'text',
              analyzer: 'standard',
            },
          },
        },
        settings: {
          analysis: {
            analyzer: {
              custom_analyzer: {
                type: 'standard',
                stopwords: '_english_',
              },
            },
          },
        },
      };

      const response = await app.request().post('/registers/keys/1/afterhandlers-reindex').set('token', jwt).send(requestBody).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('registerId', 1);
      expect(response.body.data.name).toBe('Test Key');
      expect(response.body.data).toHaveProperty('afterHandlersReindexStatus', 'completed');
      expect(response.body.data).toHaveProperty('reindexedAt');
      expect(response.body.data).toHaveProperty('processedMappings', 5);
      expect(response.body.data).toHaveProperty('appliedSettings');
      expect(response.body.data).toHaveProperty('processingTime');
    });
  });

  describe('GET /registers/keys/:key_id/records', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().get('/registers/keys/1/records').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should return records for a key with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /records
      app
        .nock('http://register:8103')
        .get('/records')
        .query({
          key_id: '1',
          allow_see_all_records: 'true',
        })
        .once()
        .reply(200, {
          data: [
            {
              id: 1,
              keyId: 1,
              registerId: 1,
              data: {
                title: 'Test Record 1',
                description: 'Test Description 1',
                value: 'test-value-1',
              },
              createdAt: '2023-01-01T00:00:00.000Z',
              updatedAt: '2023-01-01T00:00:00.000Z',
            },
            {
              id: 2,
              keyId: 1,
              registerId: 1,
              data: {
                title: 'Test Record 2',
                description: 'Test Description 2',
                value: 'test-value-2',
              },
              createdAt: '2023-01-02T00:00:00.000Z',
              updatedAt: '2023-01-02T00:00:00.000Z',
            },
          ],
          meta: {
            count: 2,
            offset: 0,
            limit: 20,
            total: 150,
          },
        });

      const response = await app.request().get('/registers/keys/1/records?key_id=1').set('token', jwt).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('id', 1);
      expect(response.body.data[0]).toHaveProperty('keyId', 1);
      expect(response.body.data[0]).toHaveProperty('registerId', 1);
      expect(response.body.data[0]).toHaveProperty('data');
      expect(response.body.data[0].data).toHaveProperty('title', 'Test Record 1');
      expect(response.body.data[0].data).toHaveProperty('value', 'test-value-1');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('count', 2);
      expect(response.body.meta).toHaveProperty('total', 150);
    });
  });

  describe('GET /registers/keys/:key_id/records/:record_id', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().get('/registers/keys/1/records/1').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should return a specific record with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /records/:record_id
      app
        .nock('http://register:8103')
        .get('/records/1')
        .once()
        .reply(200, {
          data: {
            id: 1,
            keyId: 1,
            registerId: 1,
            data: {
              title: 'Specific Test Record',
              description: 'Specific Test Description',
              value: 'specific-test-value',
              category: 'test-category',
              status: 'active',
            },
            metadata: {
              source: 'api',
              version: '1.0',
              lastModified: '2023-01-01T12:00:00.000Z',
            },
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T12:00:00.000Z',
            createdBy: {
              userId: '61efddaa351d6219eee09043',
              name: 'Test User',
            },
          },
        });

      const response = await app.request().get('/registers/keys/1/records/1').set('token', jwt).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('keyId', 1);
      expect(response.body.data).toHaveProperty('registerId', 1);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data.data).toHaveProperty('title', 'Specific Test Record');
      expect(response.body.data.data).toHaveProperty('description', 'Specific Test Description');
      expect(response.body.data.data).toHaveProperty('value', 'specific-test-value');
      expect(response.body.data.data).toHaveProperty('category', 'test-category');
      expect(response.body.data.data).toHaveProperty('status', 'active');
      expect(response.body.data).toHaveProperty('metadata');
      expect(response.body.data.metadata).toHaveProperty('source', 'api');
      expect(response.body.data.metadata).toHaveProperty('version', '1.0');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
      expect(response.body.data).toHaveProperty('createdBy');
      expect(response.body.data.createdBy).toHaveProperty('userId', '61efddaa351d6219eee09043');
    });

    it('should return empty data when record not found', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /records/:record_id (not found)
      app
        .nock('http://register:8103')
        .get('/records/999')
        .once()
        .reply(404, {
          error: {
            message: 'Record not found.',
          },
        });

      const response = await app.request().get('/registers/keys/1/records/999').set('token', jwt).expect(200);

      expect(response.body).toEqual({ data: {} });
    });
  });

  describe('POST /registers/keys/:key_id/records', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().post('/registers/keys/1/records').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should create a new record with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for POST /records
      app
        .nock('http://register:8103')
        .post('/records')
        .once()
        .reply(200, {
          data: {
            id: 3,
            keyId: 1,
            registerId: 1,
            data: {
              title: 'New Test Record',
              description: 'New Test Description',
              value: 'new-test-value',
              category: 'new-category',
              status: 'pending',
              priority: 'high',
            },
            meta: {
              source: 'api',
              version: '1.0',
              tags: ['test', 'api-created'],
              workflow: 'validation',
            },
            createdAt: '2023-01-03T00:00:00.000Z',
            updatedAt: '2023-01-03T00:00:00.000Z',
            createdBy: {
              userId: '61efddaa351d6219eee09043',
              name: 'Test User',
            },
          },
        });

      const requestBody = {
        keyId: 1,
        registerId: 1,
        data: {
          title: 'New Test Record',
          description: 'New Test Description',
          value: 'new-test-value',
          category: 'new-category',
          status: 'pending',
          priority: 'high',
        },
        meta: {
          source: 'api',
          version: '1.0',
          tags: ['test', 'api-created'],
          workflow: 'validation',
        },
      };

      const response = await app.request().post('/registers/keys/1/records').set('token', jwt).send(requestBody).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 3);
      expect(response.body.data).toHaveProperty('keyId', 1);
      expect(response.body.data).toHaveProperty('registerId', 1);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data.data).toHaveProperty('title', 'New Test Record');
      expect(response.body.data.data).toHaveProperty('description', 'New Test Description');
      expect(response.body.data.data).toHaveProperty('value', 'new-test-value');
      expect(response.body.data.data).toHaveProperty('category', 'new-category');
      expect(response.body.data.data).toHaveProperty('status', 'pending');
      expect(response.body.data.data).toHaveProperty('priority', 'high');
      expect(response.body.data).toHaveProperty('meta');
      expect(response.body.data.meta).toHaveProperty('source', 'api');
      expect(response.body.data.meta).toHaveProperty('version', '1.0');
      expect(response.body.data.meta).toHaveProperty('tags');
      expect(Array.isArray(response.body.data.meta.tags)).toBe(true);
      expect(response.body.data.meta.tags).toContain('test');
      expect(response.body.data.meta.tags).toContain('api-created');
      expect(response.body.data.meta).toHaveProperty('workflow', 'validation');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
      expect(response.body.data).toHaveProperty('createdBy');
      expect(response.body.data.createdBy).toHaveProperty('userId', '61efddaa351d6219eee09043');
      expect(response.body.data.createdBy).toHaveProperty('name', 'Test User');
    });
  });

  describe('PUT /registers/keys/:key_id/records/:record_id', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().put('/registers/keys/1/records/1').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should update a record with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for PUT /records/:id
      app
        .nock('http://register:8103')
        .put('/records/550e8400-e29b-41d4-a716-446655440000')
        .once()
        .reply(200, {
          data: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            keyId: 1,
            registerId: 1,
            data: {
              title: 'Updated Test Record',
              description: 'Updated Test Description',
              value: 'updated-test-value',
              category: 'updated-category',
              status: 'active',
              priority: 'medium',
            },
            meta: {
              source: 'api',
              version: '2.0',
              tags: ['test', 'updated'],
              workflow: 'approved',
              lastModified: '2023-01-03T12:00:00.000Z',
            },
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-03T12:00:00.000Z',
            createdBy: {
              userId: '61efddaa351d6219eee09043',
              name: 'Test User',
            },
            updatedBy: {
              userId: '61efddaa351d6219eee09043',
              name: 'Test User',
            },
          },
        });

      const requestBody = {
        keyId: 1,
        registerId: 1,
        data: {
          title: 'Updated Test Record',
          description: 'Updated Test Description',
          value: 'updated-test-value',
          category: 'updated-category',
          status: 'active',
          priority: 'medium',
        },
        meta: {
          source: 'api',
          version: '2.0',
          tags: ['test', 'updated'],
          workflow: 'approved',
          lastModified: '2023-01-03T12:00:00.000Z',
        },
      };

      const response = await app
        .request()
        .put('/registers/keys/1/records/550e8400-e29b-41d4-a716-446655440000')
        .set('token', jwt)
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', '550e8400-e29b-41d4-a716-446655440000');
      expect(response.body.data).toHaveProperty('keyId', 1);
      expect(response.body.data).toHaveProperty('registerId', 1);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data.data).toHaveProperty('title', 'Updated Test Record');
      expect(response.body.data.data).toHaveProperty('description', 'Updated Test Description');
      expect(response.body.data.data).toHaveProperty('value', 'updated-test-value');
      expect(response.body.data.data).toHaveProperty('category', 'updated-category');
      expect(response.body.data.data).toHaveProperty('status', 'active');
      expect(response.body.data.data).toHaveProperty('priority', 'medium');
      expect(response.body.data).toHaveProperty('meta');
      expect(response.body.data.meta).toHaveProperty('source', 'api');
      expect(response.body.data.meta).toHaveProperty('version', '2.0');
      expect(response.body.data.meta).toHaveProperty('tags');
      expect(Array.isArray(response.body.data.meta.tags)).toBe(true);
      expect(response.body.data.meta.tags).toContain('test');
      expect(response.body.data.meta.tags).toContain('updated');
      expect(response.body.data.meta).toHaveProperty('workflow', 'approved');
      expect(response.body.data.meta).toHaveProperty('lastModified');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
      expect(response.body.data).toHaveProperty('createdBy');
      expect(response.body.data.createdBy).toHaveProperty('userId', '61efddaa351d6219eee09043');
      expect(response.body.data.createdBy).toHaveProperty('name', 'Test User');
      expect(response.body.data).toHaveProperty('updatedBy');
      expect(response.body.data.updatedBy).toHaveProperty('userId', '61efddaa351d6219eee09043');
      expect(response.body.data.updatedBy).toHaveProperty('name', 'Test User');
    });
  });

  describe('DELETE /registers/keys/:key_id/records/:record_id', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().delete('/registers/keys/1/records/1').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should delete a record with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for DELETE /records/:id
      app
        .nock('http://register:8103')
        .delete('/records/550e8400-e29b-41d4-a716-446655440000')
        .once()
        .reply(200, {
          data: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            keyId: 1,
            registerId: 1,
            data: {
              title: 'Deleted Test Record',
              description: 'Deleted Test Description',
              value: 'deleted-test-value',
              category: 'deleted-category',
              status: 'deleted',
            },
            meta: {
              source: 'api',
              version: '1.0',
              tags: ['test', 'deleted'],
              workflow: 'deleted',
            },
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-03T12:00:00.000Z',
            deletedAt: '2023-01-03T12:00:00.000Z',
            createdBy: {
              userId: '61efddaa351d6219eee09043',
              name: 'Test User',
            },
            deletedBy: {
              userId: '61efddaa351d6219eee09043',
              name: 'Test User',
            },
          },
        });

      const response = await app.request().delete('/registers/keys/1/records/550e8400-e29b-41d4-a716-446655440000').set('token', jwt).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', '550e8400-e29b-41d4-a716-446655440000');
      expect(response.body.data).toHaveProperty('keyId', 1);
      expect(response.body.data).toHaveProperty('registerId', 1);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data.data).toHaveProperty('title', 'Deleted Test Record');
      expect(response.body.data.data).toHaveProperty('description', 'Deleted Test Description');
      expect(response.body.data.data).toHaveProperty('value', 'deleted-test-value');
      expect(response.body.data.data).toHaveProperty('category', 'deleted-category');
      expect(response.body.data.data).toHaveProperty('status', 'deleted');
      expect(response.body.data).toHaveProperty('meta');
      expect(response.body.data.meta).toHaveProperty('source', 'api');
      expect(response.body.data.meta).toHaveProperty('version', '1.0');
      expect(response.body.data.meta).toHaveProperty('tags');
      expect(Array.isArray(response.body.data.meta.tags)).toBe(true);
      expect(response.body.data.meta.tags).toContain('test');
      expect(response.body.data.meta.tags).toContain('deleted');
      expect(response.body.data.meta).toHaveProperty('workflow', 'deleted');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
      expect(response.body.data).toHaveProperty('deletedAt');
      expect(response.body.data).toHaveProperty('createdBy');
      expect(response.body.data.createdBy).toHaveProperty('userId', '61efddaa351d6219eee09043');
      expect(response.body.data.createdBy).toHaveProperty('name', 'Test User');
      expect(response.body.data).toHaveProperty('deletedBy');
      expect(response.body.data.deletedBy).toHaveProperty('userId', '61efddaa351d6219eee09043');
      expect(response.body.data.deletedBy).toHaveProperty('name', 'Test User');
    });
  });

  describe('POST /registers/records/bulk', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().post('/registers/records/bulk').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should import bulk records with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for POST /records/bulk
      app
        .nock('http://register:8103')
        .post('/records/bulk')
        .once()
        .reply(200, {
          data: {
            importId: '550e8400-e29b-41d4-a716-446655440001',
            registerId: 1,
            keyId: 1,
            background: false,
            status: 'completed',
            totalRecords: 3,
            successfulRecords: 3,
            failedRecords: 0,
            createdRecords: [
              {
                id: '550e8400-e29b-41d4-a716-446655440010',
                keyId: 1,
                registerId: 1,
                data: {
                  title: 'Bulk Record 1',
                  description: 'First bulk imported record',
                  value: 'bulk-value-1',
                  category: 'bulk-import',
                },
                createdAt: '2023-01-04T00:00:00.000Z',
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440011',
                keyId: 1,
                registerId: 1,
                data: {
                  title: 'Bulk Record 2',
                  description: 'Second bulk imported record',
                  value: 'bulk-value-2',
                  category: 'bulk-import',
                },
                createdAt: '2023-01-04T00:00:01.000Z',
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440012',
                keyId: 1,
                registerId: 1,
                data: {
                  title: 'Bulk Record 3',
                  description: 'Third bulk imported record',
                  value: 'bulk-value-3',
                  category: 'bulk-import',
                },
                createdAt: '2023-01-04T00:00:02.000Z',
              },
            ],
            errors: [],
            processingTime: '0.85s',
            importedAt: '2023-01-04T00:00:00.000Z',
            importedBy: {
              userId: '61efddaa351d6219eee09043',
              name: 'Test User',
            },
          },
        });

      const requestBody = {
        registerId: 1,
        keyId: 1,
        background: false,
        records: [
          {
            data: {
              title: 'Bulk Record 1',
              description: 'First bulk imported record',
              value: 'bulk-value-1',
              category: 'bulk-import',
            },
          },
          {
            data: {
              title: 'Bulk Record 2',
              description: 'Second bulk imported record',
              value: 'bulk-value-2',
              category: 'bulk-import',
            },
          },
          {
            data: {
              title: 'Bulk Record 3',
              description: 'Third bulk imported record',
              value: 'bulk-value-3',
              category: 'bulk-import',
            },
          },
        ],
      };

      const response = await app.request().post('/registers/records/bulk').set('token', jwt).send(requestBody).expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('importId', '550e8400-e29b-41d4-a716-446655440001');
      expect(response.body.data).toHaveProperty('registerId', 1);
      expect(response.body.data).toHaveProperty('keyId', 1);
      expect(response.body.data).toHaveProperty('background', false);
      expect(response.body.data).toHaveProperty('status', 'completed');
      expect(response.body.data).toHaveProperty('totalRecords', 3);
      expect(response.body.data).toHaveProperty('successfulRecords', 3);
      expect(response.body.data).toHaveProperty('failedRecords', 0);
      expect(response.body.data).toHaveProperty('createdRecords');
      expect(Array.isArray(response.body.data.createdRecords)).toBe(true);
      expect(response.body.data.createdRecords).toHaveLength(3);

      // Validate first created record
      expect(response.body.data.createdRecords[0]).toHaveProperty('id', '550e8400-e29b-41d4-a716-446655440010');
      expect(response.body.data.createdRecords[0]).toHaveProperty('keyId', 1);
      expect(response.body.data.createdRecords[0]).toHaveProperty('registerId', 1);
      expect(response.body.data.createdRecords[0]).toHaveProperty('data');
      expect(response.body.data.createdRecords[0].data).toHaveProperty('title', 'Bulk Record 1');
      expect(response.body.data.createdRecords[0].data).toHaveProperty('description', 'First bulk imported record');
      expect(response.body.data.createdRecords[0].data).toHaveProperty('value', 'bulk-value-1');
      expect(response.body.data.createdRecords[0].data).toHaveProperty('category', 'bulk-import');
      expect(response.body.data.createdRecords[0]).toHaveProperty('createdAt');

      // Validate second created record
      expect(response.body.data.createdRecords[1]).toHaveProperty('id', '550e8400-e29b-41d4-a716-446655440011');
      expect(response.body.data.createdRecords[1].data).toHaveProperty('title', 'Bulk Record 2');
      expect(response.body.data.createdRecords[1].data).toHaveProperty('value', 'bulk-value-2');

      // Validate third created record
      expect(response.body.data.createdRecords[2]).toHaveProperty('id', '550e8400-e29b-41d4-a716-446655440012');
      expect(response.body.data.createdRecords[2].data).toHaveProperty('title', 'Bulk Record 3');
      expect(response.body.data.createdRecords[2].data).toHaveProperty('value', 'bulk-value-3');

      expect(response.body.data).toHaveProperty('errors');
      expect(Array.isArray(response.body.data.errors)).toBe(true);
      expect(response.body.data.errors).toHaveLength(0);
      expect(response.body.data).toHaveProperty('processingTime', '0.85s');
      expect(response.body.data).toHaveProperty('importedAt');
      expect(response.body.data).toHaveProperty('importedBy');
      expect(response.body.data.importedBy).toHaveProperty('userId', '61efddaa351d6219eee09043');
      expect(response.body.data.importedBy).toHaveProperty('name', 'Test User');
    });
  });

  describe('GET /registers/:id/export', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().get('/registers/1/export').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should export register data with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app
        .nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, {
          userId: '61efddaa351d6219eee09043',
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      // Mock register service call for GET /registers/:id/export
      // The service returns the actual BPMN file content as a Buffer
      const bpmnContent = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" 
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="register-export-1" 
  targetNamespace="http://liquio.com/register/export">
  <bpmn2:process id="RegisterProcess" name="Test Register Export">
    <bpmn2:documentation>Test Register Description for Export</bpmn2:documentation>
    <bpmn2:extensionElements>
      <register:metadata xmlns:register="http://liquio.com/register">
        <register:id>1</register:id>
        <register:name>Test Register Export</register:name>
        <register:type>public</register:type>
        <register:status>active</register:status>
        <register:totalKeys>5</register:totalKeys>
        <register:totalRecords>1250</register:totalRecords>
        <register:exportedAt>2023-01-05T10:00:00.000Z</register:exportedAt>
        <register:exportedBy userId="61efddaa351d6219eee09043">Test User</register:exportedBy>
      </register:metadata>
    </bpmn2:extensionElements>
  </bpmn2:process>
</bpmn2:definitions>`);

      app
        .nock('http://register:8103')
        .get('/registers/1/export')
        .query({
          with_data: 'false',
          file: 'false',
        })
        .once()
        .reply(200, bpmnContent);

      const response = await app.request().get('/registers/1/export?with_data=false&file=false').set('token', jwt).expect(200);

      // Verify the response is a BPMN file
      expect(response.headers['content-type']).toBe('application/bpmn; charset=utf-8');
      expect(response.headers['content-disposition']).toBe('attachment; filename="register.bpmn"');

      // Verify the BPMN content
      const responseText = response.text;
      expect(responseText).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(responseText).toContain('bpmn2:definitions');
      expect(responseText).toContain('id="register-export-1"');
      expect(responseText).toContain('name="Test Register Export"');
      expect(responseText).toContain('Test Register Description for Export');
      expect(responseText).toContain('<register:id>1</register:id>');
      expect(responseText).toContain('<register:name>Test Register Export</register:name>');
      expect(responseText).toContain('<register:type>public</register:type>');
      expect(responseText).toContain('<register:status>active</register:status>');
      expect(responseText).toContain('<register:totalKeys>5</register:totalKeys>');
      expect(responseText).toContain('<register:totalRecords>1250</register:totalRecords>');
      expect(responseText).toContain('<register:exportedAt>2023-01-05T10:00:00.000Z</register:exportedAt>');
      expect(responseText).toContain('userId="61efddaa351d6219eee09043">Test User</register:exportedBy>');
    });
  });

  describe('POST /registers/import', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().post('/registers/import').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should accept register import with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock Stream.waitEndEvent to resolve quickly instead of waiting for actual stream end
      const Stream = require('../src/lib/stream');
      const originalWaitEndEvent = Stream.waitEndEvent;
      
      // Simple JSON data for import (file=false case)
      const importData = JSON.stringify({
        id: 2,
        name: 'Test Import Register',
        description: 'Test import description',
        type: 'private',
        status: 'active'
      });

      Stream.waitEndEvent = jest.fn((req) => {
        // Simulate the request chunks being collected
        setTimeout(() => {
          req.emit('data', Buffer.from(importData));
          req.emit('end');
        }, 10);
        return new Promise(resolve => setTimeout(resolve, 50));
      });

      try {
        // Mock auth check - the admin-api calls id-api service
        app.nock('http://id-api:8100')
          .get('/user/info')
          .query({ access_token: payload.authTokens.accessToken })
          .once()
          .reply(200, { 
            userId: '61efddaa351d6219eee09043', 
            role: 'admin',
            services: { eds: { data: { pem: 'PEM' } } }
          });

        // Mock register service call for POST /registers/import (called by business layer)
        app.nock('http://register:8103')
          .post('/registers/import')
          .query({
            force: 'false',
            rewrite_schema: 'false',
            clear_records: 'false',
            add_data: 'true',
            file: 'false'
          })
          .once()
          .reply(202, {
            data: {
              importId: '550e8400-e29b-41d4-a716-446655440002',
              status: 'accepted',
              message: 'Register import has been accepted and is being processed'
            }
          });

        const response = await app.request()
          .post('/registers/import?force=false&rewrite_schema=false&clear_records=false&add_data=true&file=false')
          .set('token', jwt)
          .set('Content-Type', 'application/json')
          .send(importData)
          .expect(202);

        // Verify the response indicates the import was accepted
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('isAccepted', true);
      } finally {
        // Restore the original Stream.waitEndEvent method
        Stream.waitEndEvent = originalWaitEndEvent;
      }
    }, 10000);
  });

  describe('GET /registers/:id/stream-export', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().get('/registers/1/stream-export').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });

    it('should stream export register data with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app.nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, { 
          userId: '61efddaa351d6219eee09043', 
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } }
        });

      // Mock register service call for GET /registers/:id/export (which is called by streamExport)
      app.nock('http://register:8103')
        .get('/registers/1/export')
        .query({
          with_data: 'false',
          file: 'false'
        })
        .once()
        .reply(200, {
          data: {
            id: 1,
            name: 'Test Register Stream Export',
            description: 'Test Description for Stream Export',
            type: 'public',
            status: 'active',
            keys: [
              {
                id: 1,
                name: 'Test Key 1',
                description: 'Test Key Description',
                type: 'string',
                required: true
              }
            ],
            records: [],
            meta: {
              totalKeys: 1,
              totalRecords: 0,
              exportedAt: '2023-01-05T10:00:00.000Z',
              exportedBy: {
                userId: '61efddaa351d6219eee09043',
                name: 'Test User'
              }
            }
          }
        });

      const response = await app.request()
        .get('/registers/1/stream-export')
        .set('token', jwt)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data.data).toHaveProperty('id', 1);
      expect(response.body.data.data).toHaveProperty('name', 'Test Register Stream Export');
      expect(response.body.data.data).toHaveProperty('type', 'public');
      expect(response.body.data.data).toHaveProperty('status', 'active');
      expect(response.body.data.data).toHaveProperty('keys');
      expect(Array.isArray(response.body.data.data.keys)).toBe(true);
      expect(response.body.data.data).toHaveProperty('meta');
      expect(response.body.data.data.meta).toHaveProperty('totalKeys', 1);
      expect(response.body.data.data.meta).toHaveProperty('exportedAt');
    });
  });

  describe('POST /registers/stream-import', () => {
    it('should accept register stream import with valid authorization', async () => {
      const { jwt, payload } = app.generateUserToken('61efddaa351d6219eee09043');

      // Mock auth check - the admin-api calls id-api service
      app.nock('http://id-api:8100')
        .get('/user/info')
        .query({ access_token: payload.authTokens.accessToken })
        .once()
        .reply(200, { 
          userId: '61efddaa351d6219eee09043', 
          role: 'admin',
          services: { eds: { data: { pem: 'PEM' } } }
        });

      // Mock the register business layer - stream import actually calls the regular import endpoint
      nock('http://register:8103')
        .post('/registers/import')
        .query({ 
          force: 'false',
          rewrite_schema: 'false', 
          clear_records: 'false',
          add_data: 'false',
          file: 'false'
        })
        .reply(202, { data: { isAccepted: true } });

      // Send test data to stream import endpoint
      const testData = JSON.stringify({
        data: [
          { id: '1', name: 'Stream Record 1', value: 'stream-value-1' },
          { id: '2', name: 'Stream Record 2', value: 'stream-value-2' }
        ]
      });

      const response = await app.request()
        .post('/registers/stream-import')
        .set('token', jwt)
        .send(testData)
        .expect(202);

      expect(response.body).toEqual({ data: { isAccepted: true } });
    });

    it('should fail without authorization', async () => {
      const response = await app.request().post('/registers/stream-import').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });
  });

  describe('GET /registers/:id/keys/:keyId/export-xlsx', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().get('/registers/1/keys/1/export-xlsx').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });
  });

  describe('POST /registers/:id/keys/:keyId/import-xlsx', () => {
    it('should fail without authorization', async () => {
      const response = await app.request().post('/registers/1/keys/1/import-xlsx').expect(401);

      expect(response.body).toEqual({
        error: {
          message: 'Token should be defined in request headers.',
        },
        traceId: expect.any(String),
      });
    });
  });
});
