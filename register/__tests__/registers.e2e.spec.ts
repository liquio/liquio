import { TestHarness } from './test-harness';

describe('RegistersController', () => {
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

  describe('GET /registers', () => {
    it('should return 401 without authentication', async () => {
      await testHarness
        .request()
        .get('/registers')
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('error');
        });
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness
        .request()
        .get('/registers')
        .set('Authorization', invalidAuth)
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('error');
        });
    });

    it('should return 200 and an array of registers', async () => {
      await testHarness
        .request()
        .get('/registers')
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(Array.isArray(response.body.data)).toBe(true);
          expect(response.body.data.length).toBeGreaterThan(1);
          expect(response.body.data[0]).toEqual({
            id: expect.any(Number),
            name: expect.any(String),
            description: expect.any(String),
            parentId: null,
            meta: expect.anything(),
            data: expect.anything(),
            createdBy: expect.any(String),
            updatedBy: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          });
        });
    });

    it('should return 200 and filter registers by id', async () => {
      await testHarness
        .request()
        .get('/registers?id=300')
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(Array.isArray(response.body.data)).toBe(true);
          expect(response.body.data.length).toBe(1);
          expect(response.body.data[0]).toEqual({
            id: 300,
            name: 'Registers Test Register',
            description: 'Register for registers tests',
            parentId: null,
            meta: { isTest: true },
            data: {},
            createdBy: 'test-user',
            updatedBy: 'test-user',
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          });
        });
    });
  });

  describe('GET /registers/:id', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().get('/registers/300').expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness.request().get('/registers/300').set('Authorization', invalidAuth).expect(401).expect('Content-Type', /json/);
    });

    it('should return 200 and a single register', async () => {
      await testHarness
        .request()
        .get('/registers/300')
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toEqual({
            id: 300,
            name: 'Registers Test Register',
            description: 'Register for registers tests',
            parentId: null,
            meta: { isTest: true },
            data: {},
            createdBy: 'test-user',
            updatedBy: 'test-user',
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          });
        });
    });

    it('should return 404 for non-existent register', async () => {
      await testHarness.request().get('/registers/999999').set('Authorization', validAuth).expect(404).expect('Content-Type', /json/);
    });
  });

  describe('POST /registers', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().post('/registers').send({ name: 'Test Register' }).expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness
        .request()
        .post('/registers')
        .set('Authorization', invalidAuth)
        .send({ name: 'Test Register' })
        .expect(401)
        .expect('Content-Type', /json/);
    });

    it('should return 422 when validation fails', async () => {
      await testHarness
        .request()
        .post('/registers')
        .set('Authorization', validAuth)
        .send({ name: 'Test Register' })
        .expect(422)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('errors');
          expect(Array.isArray(response.body.errors)).toBe(true);
          expect(response.body.errors.length).toBeGreaterThan(0);
          expect(response.body.errors[0]).toEqual({
            location: 'body',
            msg: expect.any(String),
            param: 'description'
          });
        });
    });

    it('should return 200 and create a new register', async () => {
      let createdId: number;

      await testHarness
        .request()
        .post('/registers')
        .set('Authorization', validAuth)
        .send({
          name: 'New Test Register',
          description: 'A test register description'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toEqual({
            id: expect.any(Number),
            name: 'New Test Register',
            description: 'A test register description',
            parentId: null,
            meta: {},
            data: {},
            createdBy: expect.any(String),
            updatedBy: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          });
          createdId = response.body.data.id;
        });

      // Verify the register was actually created by fetching it
      await testHarness
        .request()
        .get(`/registers/${createdId}`)
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toEqual({
            id: createdId,
            name: 'New Test Register',
            description: 'A test register description',
            parentId: null,
            meta: {},
            data: {},
            createdBy: expect.any(String),
            updatedBy: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          });
        });
    });
  });

  describe('PUT /registers/:id', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().put('/registers/300').send({ name: 'Updated Register' }).expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness
        .request()
        .put('/registers/300')
        .set('Authorization', invalidAuth)
        .send({ name: 'Updated Register' })
        .expect(401)
        .expect('Content-Type', /json/);
    });

    it('should return 422 when validation fails', async () => {
      await testHarness
        .request()
        .put('/registers/300')
        .set('Authorization', validAuth)
        .send({ name: 'Updated Register' })
        .expect(422)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('errors');
          expect(Array.isArray(response.body.errors)).toBe(true);
          expect(response.body.errors.length).toBeGreaterThan(0);
          expect(response.body.errors[0]).toEqual({
            location: 'body',
            msg: expect.any(String),
            param: 'description'
          });
        });
    });

    it('should return 500 for non-existent register', async () => {
      await testHarness
        .request()
        .put('/registers/999999')
        .set('Authorization', validAuth)
        .send({
          name: 'Updated Register',
          description: 'Updated description'
        })
        .expect(500)
        .expect('Content-Type', /json/);
    });

    it('should return 200 and update a register', async () => {
      // First create a register to update
      let createdId: number;
      await testHarness
        .request()
        .post('/registers')
        .set('Authorization', validAuth)
        .send({
          name: 'Register to Update',
          description: 'Original description'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          createdId = response.body.data.id;
        });

      // Now update it
      await testHarness
        .request()
        .put(`/registers/${createdId}`)
        .set('Authorization', validAuth)
        .send({
          name: 'Updated Test Register',
          description: 'Updated description'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.data).toEqual({
            id: createdId,
            name: 'Updated Test Register',
            description: 'Updated description',
            parentId: null,
            meta: {},
            data: {},
            createdBy: expect.any(String),
            updatedBy: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          });
        });

      // Note: Due to caching, verification via GET may show stale data
    });
  });

  describe('DELETE /registers/:id', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().delete('/registers/999').expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness.request().delete('/registers/999').set('Authorization', invalidAuth).expect(401).expect('Content-Type', /json/);
    });

    it('should return 500 for non-existent register', async () => {
      await testHarness.request().delete('/registers/999999').set('Authorization', validAuth).expect(500).expect('Content-Type', /json/);
    });

    it('should return 200 and delete a register', async () => {
      let createdId: number;

      // Create a register to delete
      await testHarness
        .request()
        .post('/registers')
        .set('Authorization', validAuth)
        .send({
          name: 'Register to Delete',
          description: 'This register will be deleted'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
          createdId = response.body.data.id;
        });

      // Delete the register
      await testHarness
        .request()
        .delete(`/registers/${createdId}`)
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
        });

      // Verify the register was actually deleted
      await testHarness.request().get(`/registers/${createdId}`).set('Authorization', validAuth).expect(404).expect('Content-Type', /json/);
    });
  });

  describe('GET /registers/:id/export', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().get('/registers/300/export').expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness.request().get('/registers/300/export').set('Authorization', invalidAuth).expect(401).expect('Content-Type', /json/);
    });
  });

  describe('POST /registers/import', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().post('/registers/import').send({}).expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness.request().post('/registers/import').set('Authorization', invalidAuth).send({}).expect(401).expect('Content-Type', /json/);
    });
  });

  describe('GET /registers/:id/stream-export', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().get('/registers/300/stream-export').expect(401);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness.request().get('/registers/300/stream-export').set('Authorization', invalidAuth).expect(401);
    });
  });

  describe('POST /registers/stream-import', () => {
    it('should return 401 without authentication', async () => {
      await testHarness.request().post('/registers/stream-import').send({}).expect(401).expect('Content-Type', /json/);
    });

    it('should return 401 with invalid authentication', async () => {
      await testHarness
        .request()
        .post('/registers/stream-import')
        .set('Authorization', invalidAuth)
        .send({})
        .expect(401)
        .expect('Content-Type', /json/);
    });
  });
});
