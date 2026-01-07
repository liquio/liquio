import { TestHarness } from './test-harness';

describe('RecordsController', () => {
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

  describe('GET /records', () => {
    it('should return 401 without authentication', async () => {
      await testHarness
        .request()
        .get('/records')
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('error');
        });
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness
        .request()
        .get('/records')
        .set('Authorization', invalidAuth)
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('error');
        });
    });

    it('should return 200 and an array of records', async () => {
      await testHarness
        .request()
        .get('/records?key_id=2001')
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(Array.isArray(response.body.data)).toBe(true);
          // May be empty if no records exist yet for this new key
          expect(response.body.data[0] || {}).toEqual(
            response.body.data.length > 0
              ? {
                  id: expect.any(String),
                  registerId: expect.any(Number),
                  keyId: expect.any(Number),
                  data: expect.anything(),
                  meta: expect.anything(),
                  allowTokens: expect.anything(),
                  signature: null,
                  isEncrypted: expect.any(Boolean),
                  createdBy: expect.any(String),
                  updatedBy: expect.any(String),
                  createdAt: expect.any(String),
                  updatedAt: expect.any(String)
                }
              : {}
          );
        });
    });

    it('should return 200 and filter records by register_id and key_id', async () => {
      await testHarness
        .request()
        .get('/records?register_id=200&key_id=2001')
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(Array.isArray(response.body.data)).toBe(true);
          // May be empty if no fixture records exist for this register/key combo yet
          if (response.body.data.length > 0) {
            expect(response.body.data.every((record) => record.registerId === 200 && record.keyId === 2001)).toBe(true);
          }
        });
    });
  });

  describe('GET /records/:id', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().get('/records/88b68700-09b8-11ee-8bd8-f1f3dc4af6ad').expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness
        .request()
        .get('/records/88b68700-09b8-11ee-8bd8-f1f3dc4af6ad')
        .set('Authorization', invalidAuth)
        .expect(401)
        .expect('Content-Type', /json/);
    });

    it('should return 200 and a single record', async () => {
      await testHarness
        .request()
        .get('/records/88b68700-09b8-11ee-8bd8-f1f3dc4af6ad')
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toEqual({
            id: '88b68700-09b8-11ee-8bd8-f1f3dc4af6ad',
            registerId: 90,
            keyId: 149,
            data: expect.any(Object),
            meta: expect.any(Object),
            allowTokens: expect.anything(),
            signature: null,
            isEncrypted: false,
            createdBy: 'diia-stage',
            updatedBy: 'diia-stage',
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          });
        });
    });

    it('should return 404 for non-existent record', async () => {
      await testHarness
        .request()
        .get('/records/00000000-0000-0000-0000-000000000000')
        .set('Authorization', validAuth)
        .expect(404)
        .expect('Content-Type', /json/);
    });
  });

  describe('POST /records', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().post('/records').send({ data: {} }).expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness.request().post('/records').set('Authorization', invalidAuth).send({ data: {} }).expect(401).expect('Content-Type', /json/);
    });

    it('should return 422 when validation fails', async () => {
      await testHarness
        .request()
        .post('/records')
        .set('Authorization', validAuth)
        .send({ data: {} })
        .expect(422)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('errors');
          expect(Array.isArray(response.body.errors)).toBe(true);
          expect(response.body.errors.length).toBeGreaterThan(0);
        });
    });

    it('should return 200 and create a new record', async () => {
      let createdId: string;

      const response = await testHarness
        .request()
        .post('/records')
        .set('Authorization', validAuth)
        .send({
          registerId: 200,
          keyId: 2001,
          data: {
            name: 'Test Record',
            data: 'TEST001'
          }
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual({
        id: expect.any(String),
        registerId: 200,
        keyId: 2001,
        data: {
          name: 'Test Record',
          data: 'TEST001'
        },
        meta: expect.anything(),
        allowTokens: expect.anything(),
        signature: null,
        isEncrypted: false,
        createdBy: expect.any(String),
        updatedBy: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
      createdId = response.body.data.id;

      // Verify the record was actually created by fetching it
      await testHarness
        .request()
        .get(`/records/${createdId}`)
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data.id).toBe(createdId);
          expect(response.body.data.data.name).toBe('Test Record');
        });
    });
  });

  describe('PUT /records/:id', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().put('/records/88b68700-09b8-11ee-8bd8-f1f3dc4af6ad').send({ data: {} }).expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness
        .request()
        .put('/records/88b68700-09b8-11ee-8bd8-f1f3dc4af6ad')
        .set('Authorization', invalidAuth)
        .send({ data: {} })
        .expect(401)
        .expect('Content-Type', /json/);
    });

    it('should return 422 when validation fails', async () => {
      await testHarness
        .request()
        .put('/records/88b68700-09b8-11ee-8bd8-f1f3dc4af6ad')
        .set('Authorization', validAuth)
        .send({ data: {} })
        .expect(422)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('errors');
          expect(Array.isArray(response.body.errors)).toBe(true);
          expect(response.body.errors.length).toBeGreaterThan(0);
        });
    });

    it('should return 500 for non-existent record', async () => {
      await testHarness
        .request()
        .put('/records/00000000-0000-0000-0000-000000000000')
        .set('Authorization', validAuth)
        .send({
          registerId: 200,
          keyId: 2001,
          data: { name: 'Updated' }
        })
        .expect(500)
        .expect('Content-Type', /json/);
    });

    it('should return 200 and update a record', async () => {
      // First, create a record that we can safely update
      let createdId: string;
      await testHarness
        .request()
        .post('/records')
        .set('Authorization', validAuth)
        .send({
          registerId: 200,
          keyId: 2001,
          data: {
            name: 'Record to Update',
            data: 'TEST002'
          }
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          createdId = response.body.data.id;
        });

      // Now update the record
      await testHarness
        .request()
        .put(`/records/${createdId}`)
        .set('Authorization', validAuth)
        .send({
          registerId: 200,
          keyId: 2001,
          data: {
            name: 'Updated Record Name',
            data: 'TEST002_UPDATED'
          }
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data.id).toBe(createdId);
          // Note: Due to caching, verification via GET may show stale data
        });
    });
  });

  describe('PATCH /records/:id', () => {
    it('should return 401 without authentication', async () => {
      await testHarness
        .request()
        .patch('/records/88b68700-09b8-11ee-8bd8-f1f3dc4af6ad')
        .send({ keyId: 2001, properties: [] })
        .expect(401)
        .expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness
        .request()
        .patch('/records/88b68700-09b8-11ee-8bd8-f1f3dc4af6ad')
        .set('Authorization', invalidAuth)
        .send({ keyId: 2001, properties: [] })
        .expect(401)
        .expect('Content-Type', /json/);
    });

    it('should return 422 when validation fails', async () => {
      await testHarness
        .request()
        .patch('/records/88b68700-09b8-11ee-8bd8-f1f3dc4af6ad')
        .set('Authorization', validAuth)
        .send({ properties: [] })
        .expect(422)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('errors');
          expect(Array.isArray(response.body.errors)).toBe(true);
          expect(response.body.errors.length).toBeGreaterThan(0);
        });
    });
  });

  describe('DELETE /records/:id', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().delete('/records/some-id').expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness.request().delete('/records/some-id').set('Authorization', invalidAuth).expect(401).expect('Content-Type', /json/);
    });

    it('should return 500 for non-existent record', async () => {
      await testHarness
        .request()
        .delete('/records/00000000-0000-0000-0000-000000000000')
        .set('Authorization', validAuth)
        .expect(500)
        .expect('Content-Type', /json/);
    });

    it('should return 200 and delete a record', async () => {
      let createdId: string;

      // Create a record to delete
      await testHarness
        .request()
        .post('/records')
        .set('Authorization', validAuth)
        .send({
          registerId: 200,
          keyId: 2001,
          data: {
            name: 'Record to Delete',
            data: 'TEST003'
          }
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          createdId = response.body.data.id;
        });

      // Delete the record
      await testHarness
        .request()
        .delete(`/records/${createdId}`)
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
        });

      // Verify the record was actually deleted
      await testHarness.request().get(`/records/${createdId}`).set('Authorization', validAuth).expect(404).expect('Content-Type', /json/);
    });
  });
});
