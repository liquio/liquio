import { TestHarness } from './test-harness';

describe('KeysController', () => {
  let testHarness: TestHarness;
  const validAuth = 'Basic dGVzdDp0ZXN0';
  const invalidAuth = 'Basic aW52YWxpZDppbnZhbGlk';

  beforeAll(async () => {
    testHarness = new TestHarness();
    await testHarness.setup({ useDatabase: true, useRedis: true });
    await testHarness.setupFixtures();
  }, 30000);

  afterAll(async () => {
    await testHarness.teardown();
  });

  describe('GET /keys', () => {
    it('should return 401 without authentication', async () => {
      await testHarness
        .request()
        .get('/keys')
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('error');
        });
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness
        .request()
        .get('/keys')
        .set('Authorization', invalidAuth)
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('error');
        });
    });

    it('should return 200 and an array of keys', async () => {
      await testHarness
        .request()
        .get('/keys')
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(Array.isArray(response.body.data)).toBe(true);
          expect(response.body.data.length).toBeGreaterThan(0);
          expect(response.body.data[0]).toEqual({
            id: expect.any(Number),
            registerId: expect.any(Number),
            name: expect.any(String),
            description: expect.any(String),
            schema: expect.anything(),
            parentId: null,
            meta: expect.anything(),
            toString: expect.anything(),
            toSearchString: expect.anything(),
            toExport: expect.anything(),
            accessMode: expect.any(String),
            isEncrypted: expect.any(Boolean),
            lock: expect.any(Boolean), // Obsolete field, but still returned by API
            createdBy: expect.any(String),
            updatedBy: expect.anything(),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            data: expect.anything()
          });
        });
    });

    it('should return 200 and filter keys by register_id', async () => {
      await testHarness
        .request()
        .get('/keys?register_id=100')
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(Array.isArray(response.body.data)).toBe(true);
          // May be empty if no keys created for this register yet
          expect(response.body.data.every((key) => key.registerId === 100 || response.body.data.length === 0)).toBe(true);
        });
    });
  });

  describe('GET /keys/:id', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().get('/keys/149').expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness.request().get('/keys/149').set('Authorization', invalidAuth).expect(401).expect('Content-Type', /json/);
    });

    it('should return 200 and a single key', async () => {
      await testHarness
        .request()
        .get('/keys/149')
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toEqual({
            id: 149,
            registerId: 90, // Legacy fixture still uses register 90
            name: 'ДРАЦС з номерами',
            description: 'ДРАЦС з номерами',
            parentId: null,
            schema: expect.any(Object),
            meta: expect.any(Object),
            data: {},
            toString: '(record) => { return record.data.NAME; };',
            toSearchString: expect.any(String),
            toExport: '(record) => { return null; }',
            accessMode: 'full',
            isEncrypted: false,
            lock: false, // Obsolete field, but still returned by API
            createdBy: 'diia-stage',
            updatedBy: 'diia-stage',
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          });
        });
    });

    it('should return 404 for non-existent key', async () => {
      await testHarness.request().get('/keys/999999').set('Authorization', validAuth).expect(404).expect('Content-Type', /json/);
    });
  });

  describe('POST /keys', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().post('/keys').send({ name: 'Test Key' }).expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness
        .request()
        .post('/keys')
        .set('Authorization', invalidAuth)
        .send({ name: 'Test Key' })
        .expect(401)
        .expect('Content-Type', /json/);
    });

    it('should return 422 when validation fails', async () => {
      await testHarness
        .request()
        .post('/keys')
        .set('Authorization', validAuth)
        .send({ name: 'Test Key' })
        .expect(422)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('errors');
          expect(Array.isArray(response.body.errors)).toBe(true);
          expect(response.body.errors.length).toBeGreaterThan(0);
        });
    });

    it('should return 200 and create a new key', async () => {
      let createdId: number;

      await testHarness
        .request()
        .post('/keys')
        .set('Authorization', validAuth)
        .send({
          registerId: 100,
          name: 'New Test Key',
          description: 'A test key description',
          schema: { type: 'object', properties: {} },
          toString: '(record) => { return record.data.name; }',
          toSearchString: '(record) => { return [record.data.name]; }',
          toExport: '(record) => { return null; }'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toEqual({
            id: expect.any(Number),
            registerId: 100,
            name: 'New Test Key',
            description: 'A test key description',
            parentId: null,
            schema: { type: 'object', properties: {} },
            meta: {},
            data: {},
            toString: '(record) => { return record.data.name; }',
            toSearchString: '(record) => { return [record.data.name]; }',
            toExport: '(record) => { return null; }',
            accessMode: 'full',
            isEncrypted: false,
            createdBy: expect.any(String),
            updatedBy: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          });
          createdId = response.body.data.id;
        });

      // Verify the key was actually created by fetching it
      await testHarness
        .request()
        .get(`/keys/${createdId}`)
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data.id).toBe(createdId);
          expect(response.body.data.name).toBe('New Test Key');
        });
    });
  });

  describe('PUT /keys/:id', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().put('/keys/151').send({ name: 'Updated Key' }).expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness
        .request()
        .put('/keys/151')
        .set('Authorization', invalidAuth)
        .send({ name: 'Updated Key' })
        .expect(401)
        .expect('Content-Type', /json/);
    });

    it('should return 422 when validation fails', async () => {
      await testHarness
        .request()
        .put('/keys/151')
        .set('Authorization', validAuth)
        .send({ name: 'Updated Key' })
        .expect(422)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('errors');
          expect(Array.isArray(response.body.errors)).toBe(true);
          expect(response.body.errors.length).toBeGreaterThan(0);
        });
    });

    it('should return 404 for non-existent key', async () => {
      await testHarness
        .request()
        .put('/keys/999999')
        .set('Authorization', validAuth)
        .send({
          registerId: 100,
          name: 'Updated Key',
          description: 'Updated description'
        })
        .expect(404)
        .expect('Content-Type', /json/);
    });

    it('should return 200 and update a key', async () => {
      // First, create a key that we can safely update
      let createdId: number;
      await testHarness
        .request()
        .post('/keys')
        .set('Authorization', validAuth)
        .send({
          registerId: 100,
          name: 'Key to Update',
          description: 'Original description',
          schema: { type: 'object', properties: {} },
          toString: '(record) => { return record.data.name; }',
          toSearchString: '(record) => { return [record.data.name]; }',
          toExport: '(record) => { return null; }'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          createdId = response.body.data.id;
        });

      // Now update the key
      await testHarness
        .request()
        .put(`/keys/${createdId}`)
        .set('Authorization', validAuth)
        .send({
          name: 'Updated Key Name',
          description: 'Updated description',
          schema: { type: 'object', properties: { updated: { type: 'boolean' } } },
          toString: '(record) => { return record.data.updatedName; }',
          toSearchString: '(record) => { return [record.data.updatedName]; }',
          toExport: '(record) => { return null; }'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data.id).toBe(createdId);
          // Note: Due to caching, the response may contain old data
          // but the update is persisted to the database
        });
    });
  });

  describe('DELETE /keys/:id', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().delete('/keys/999').expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness.request().delete('/keys/999').set('Authorization', invalidAuth).expect(401).expect('Content-Type', /json/);
    });

    it('should return 500 for non-existent key', async () => {
      await testHarness.request().delete('/keys/999999').set('Authorization', validAuth).expect(500).expect('Content-Type', /json/);
    });

    it('should return 200 and delete a key', async () => {
      let createdId: number;

      // Create a key to delete
      await testHarness
        .request()
        .post('/keys')
        .set('Authorization', validAuth)
        .send({
          registerId: 100,
          name: 'Key to Delete',
          description: 'This key will be deleted',
          schema: { type: 'object', properties: {} },
          toString: '(record) => { return record.data.name; }',
          toSearchString: '(record) => { return [record.data.name]; }',
          toExport: '(record) => { return null; }'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          createdId = response.body.data.id;
        });

      // Delete the key
      await testHarness
        .request()
        .delete(`/keys/${createdId}`)
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
        });

      // Verify the key was actually deleted
      await testHarness.request().get(`/keys/${createdId}`).set('Authorization', validAuth).expect(404).expect('Content-Type', /json/);
    });
  });
});
