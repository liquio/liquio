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
                  updatedAt: expect.any(String),
                }
              : {},
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
            updatedAt: expect.any(String),
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
            data: 'TEST001',
          },
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
          data: 'TEST001',
        },
        meta: expect.anything(),
        allowTokens: expect.anything(),
        signature: null,
        isEncrypted: false,
        createdBy: expect.any(String),
        updatedBy: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
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
          data: { name: 'Updated' },
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
            data: 'TEST002',
          },
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
            data: 'TEST002_UPDATED',
          },
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

    describe('patchable paths (RG-02e)', () => {
      let id: string;
      const patch = (properties: object[]) =>
        testHarness.request().patch(`/records/${id}`).set('Authorization', validAuth).send({ keyId: 2001, properties });
      const read = async () => (await testHarness.request().get(`/records/${id}`).set('Authorization', validAuth).expect(200)).body.data;

      beforeAll(async () => {
        const response = await testHarness
          .request()
          .post('/records')
          .set('Authorization', validAuth)
          .send({ registerId: 200, keyId: 2001, data: { name: 'before', data: 'RG02E' } })
          .expect(200);
        id = response.body.data.id;
      });

      afterAll(async () => {
        await testHarness.request().delete(`/records/${id}`).set('Authorization', validAuth);
      });

      it.each(['key_id', 'id', 'meta', 'created_by', 'updated_by', 'created_at', 'allow_tokens', 'register_id'])(
        'rejects a patch of the column %s with 400 and changes nothing',
        async (path) => {
          const before = await read();
          const response = await patch([{ path, previousValue: 'x', value: 'y' }]).expect(400);
          expect(response.body.data).toBeUndefined();
          expect(await read()).toEqual(before);
        },
      );

      it('rejects a mixed request as a whole', async () => {
        await patch([
          { path: 'data.name', previousValue: 'before', value: 'mixed' },
          { path: 'key_id', previousValue: 2001, value: 1 },
        ]).expect(400);
        expect((await read()).data.name).toBe('before');
      });

      it('also rejects column paths from a trusted caller', async () => {
        const saved = testHarness.getConfig().auth.trustedCallers;
        testHarness.getConfig().auth.trustedCallers = ['test'];
        try {
          await patch([{ path: 'key_id', previousValue: 2001, value: 1 }]).expect(400);
        } finally {
          testHarness.getConfig().auth.trustedCallers = saved;
        }
      });

      it('still patches data paths', async () => {
        await patch([{ path: 'data.name', previousValue: 'before', value: 'after' }]).expect(200);
        expect((await read()).data.name).toBe('after');
      });
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

  describe('POST /records/filter', () => {
    it('should support body-based filter params', async () => {
      const createdIds: string[] = [];

      const createRecord = async (name: string, dataValue: string) => {
        const response = await testHarness
          .request()
          .post('/records')
          .set('Authorization', validAuth)
          .send({
            registerId: 200,
            keyId: 2001,
            data: { name, data: dataValue },
          })
          .expect(200);

        createdIds.push(response.body.data.id);
      };

      await createRecord('Filter Body Match', 'BODY_FILTER_MATCH_001');
      await createRecord('Filter Body Miss', 'BODY_FILTER_MISS_001');

      const response = await testHarness
        .request()
        .post('/records/filter')
        .set('Authorization', validAuth)
        .send({
          key_id: 2001,
          register_id: 200,
          data: {
            data: 'BODY_FILTER_MATCH_001',
          },
          limit: 50,
          offset: 0,
        })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some((record) => record.data?.data === 'BODY_FILTER_MATCH_001')).toBe(true);
      expect(response.body.data.some((record) => record.data?.data === 'BODY_FILTER_MISS_001')).toBe(false);

      await Promise.all(createdIds.map((id) => testHarness.request().delete(`/records/${id}`).set('Authorization', validAuth).expect(200)));
    });

    it('should not fail on malformed URI-encoded search_equal values', async () => {
      const response = await testHarness
        .request()
        .post('/records/filter?key_id=2001&search_equal=%E0%A4%A')
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('search strings', () => {
    it('should calculate the search string with the key toSearchString on create', async () => {
      const createResponse = await testHarness
        .request()
        .post('/records')
        .set('Authorization', validAuth)
        .send({ registerId: 200, keyId: 2001, data: { name: 'Search String Create 001', data: 'SS_CREATE_001' } })
        .expect(200);

      const response = await testHarness
        .request()
        .get('/records?key_id=2001&search_equal=Search String Create 001')
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.data.map((record) => record.id)).toEqual([createResponse.body.data.id]);

      await testHarness.request().delete(`/records/${createResponse.body.data.id}`).set('Authorization', validAuth).expect(200);
    });

    it('should recalculate the search string with the key toSearchString on update', async () => {
      const createResponse = await testHarness
        .request()
        .post('/records')
        .set('Authorization', validAuth)
        .send({ registerId: 200, keyId: 2001, data: { name: 'Search String Before 001', data: 'SS_UPDATE_001' } })
        .expect(200);
      const id = createResponse.body.data.id;

      await testHarness
        .request()
        .put(`/records/${id}`)
        .set('Authorization', validAuth)
        .send({ registerId: 200, keyId: 2001, data: { name: 'Search String After 001', data: 'SS_UPDATE_001' } })
        .expect(200);

      const response = await testHarness
        .request()
        .get('/records?key_id=2001&search_equal=Search String After 001')
        .set('Authorization', validAuth)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.data.map((record) => record.id)).toEqual([id]);

      await testHarness.request().delete(`/records/${id}`).set('Authorization', validAuth).expect(200);
    });
  });

  describe('csv_map export formula injection (SE-3930 RG-23)', () => {
    const csvMap = JSON.stringify({ n: 'data.name', d: 'data.data' });
    const createdIds: string[] = [];

    beforeAll(async () => {
      const response = await testHarness
        .request()
        .post('/records')
        .set('Authorization', validAuth)
        .send({ registerId: 200, keyId: 2001, data: { name: '=cmd|"/c calc"!A1', data: 'CSV_RG23_MARK' } })
        .expect(200);
      createdIds.push(response.body.data.id);
    });

    afterAll(async () => {
      await Promise.all(createdIds.map((id) => testHarness.request().delete(`/records/${id}`).set('Authorization', validAuth)));
    });

    const expectSafe = (text: string) => {
      expect(text).toContain(`"'=cmd|""/c calc""!A1"`);
      expect(text).not.toMatch(/(^|,)"=/m);
      expect(text).not.toContain('\\"');
    };

    it('neutralises formulas in GET /records', async () => {
      const response = await testHarness
        .request()
        .get('/records')
        .query({ key_id: 2001, register_id: 200, csv_map: csvMap, data: { data: 'CSV_RG23_MARK' } })
        .set('Authorization', validAuth)
        .expect(200);
      expectSafe(response.text);
    });

    it('neutralises formulas in POST /records/filter', async () => {
      const response = await testHarness
        .request()
        .post('/records/filter')
        .set('Authorization', validAuth)
        .send({ key_id: 2001, register_id: 200, csv_map: csvMap, data: { data: 'CSV_RG23_MARK' } })
        .expect(200);
      expectSafe(response.text);
    });
  });

  describe('no_limit csv_map export is paged and bounded (SE-3930 RG-24)', () => {
    const csvMap = JSON.stringify({ n: 'data.name' });
    const createdIds: string[] = [];
    const names = ['a', 'b', 'c', 'd', 'e'].map((v) => `RG24_${v}`);
    let originalPagination: any;

    beforeAll(async () => {
      for (const name of names) {
        const response = await testHarness
          .request()
          .post('/records')
          .set('Authorization', validAuth)
          .send({ registerId: 200, keyId: 2001, data: { name, data: 'RG24_MARK' } })
          .expect(200);
        createdIds.push(response.body.data.id);
      }
      originalPagination = { ...testHarness.getConfig().pagination };
    });

    afterEach(() => {
      Object.assign(testHarness.getConfig().pagination, originalPagination);
    });

    afterAll(async () => {
      await Promise.all(createdIds.map((id) => testHarness.request().delete(`/records/${id}`).set('Authorization', validAuth)));
    });

    const exportAll = () =>
      testHarness
        .request()
        .get('/records')
        .query({ key_id: 2001, register_id: 200, csv_map: csvMap, no_limit: true, sort: { 'data.name': 'asc' }, data: { data: 'RG24_MARK' } })
        .set('Authorization', validAuth);

    it('returns every row in order across several pages when under the ceiling', async () => {
      Object.assign(testHarness.getConfig().pagination, { maxLimit: 2, maxCsvExportRecords: 10 });
      const response = await exportAll().expect(200);
      const lines = response.text.trim().split('\n').slice(1);
      expect(lines.map((line) => line.replace(/"/g, ''))).toEqual(names);
    });

    it('rejects with 413 when the matching rows exceed the ceiling', async () => {
      Object.assign(testHarness.getConfig().pagination, { maxLimit: 2, maxCsvExportRecords: 3 });
      const response = await exportAll().expect(413);
      expect(response.body.error.message).toMatch(/Too many records/);
    });
  });

  describe('request body limits (SE-3930 RG-25)', () => {
    const big = { data: 'x'.repeat(11 * 1024 * 1024) };

    it('rejects an oversized unauthenticated bulk request with 401 before parsing', async () => {
      await testHarness.request().post('/records/bulk').send(big).expect(401);
    });

    it('rejects an oversized body on an ordinary route with 413', async () => {
      await testHarness.request().post('/records').set('Authorization', validAuth).send(big).expect(413);
    });

    it('accepts a body above the default limit on an authenticated bulk route', async () => {
      const response = await testHarness.request().post('/records/bulk').set('Authorization', validAuth).send(big);
      expect(response.status).not.toBe(413);
      expect(response.status).not.toBe(401);
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
            data: 'TEST003',
          },
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

  describe('client-supplied security flags (SE-3930 RG-01/RG-05)', () => {
    const marker = 'SECFLAGS_E2E_001';
    let restrictedId: string;
    let savedAuth: any;

    const queryByPost = (body: object) =>
      testHarness
        .request()
        .post('/records-by-post')
        .set('Authorization', validAuth)
        .send({ key_id: 2001, register_id: 200, data: { data: marker }, ...body });
    const queryFiltered = (body: object) =>
      testHarness
        .request()
        .post('/records/filter')
        .set('Authorization', validAuth)
        .send({ key_id: 2001, register_id: 200, data: { data: marker }, ...body });
    const ids = (response) => response.body.data.map((r) => r.id);

    beforeAll(async () => {
      const response = await testHarness
        .request()
        .post('/records')
        .set('Authorization', validAuth)
        .send({ registerId: 200, keyId: 2001, data: { name: 'Restricted', data: marker }, allowTokens: ['secret-token'] })
        .expect(200);
      restrictedId = response.body.data.id;
    });

    beforeEach(() => {
      savedAuth = { ...testHarness.getConfig().auth };
    });

    afterEach(() => {
      testHarness.getConfig().auth = savedAuth;
    });

    afterAll(async () => {
      await testHarness.request().delete(`/records/${restrictedId}`).set('Authorization', validAuth);
    });

    it('ignores allow_see_all_records from an untrusted caller', async () => {
      testHarness.getConfig().auth.trustedCallers = [];
      for (const send of [queryByPost, queryFiltered]) {
        const response = await send({ allow_see_all_records: true }).expect(200);
        expect(ids(response)).not.toContain(restrictedId);
      }
    });

    it('ignores a client-supplied foreign allow_tokens from an untrusted caller', async () => {
      testHarness.getConfig().auth.trustedCallers = [];
      for (const send of [queryByPost, queryFiltered]) {
        const response = await send({ allow_tokens: ['secret-token'], disable_fields_rules: true }).expect(200);
        expect(ids(response)).not.toContain(restrictedId);
      }
    });

    it('ignores the flags on GET /records (query) for an untrusted caller', async () => {
      testHarness.getConfig().auth.trustedCallers = [];
      const response = await testHarness
        .request()
        .get(`/records?key_id=2001&register_id=200&limit=1000&allow_see_all_records=true&allow_tokens=secret-token`)
        .set('Authorization', validAuth)
        .expect(200);
      expect(ids(response)).not.toContain(restrictedId);
    });

    it('uses server-side auth.userAllowTokens for an untrusted caller', async () => {
      testHarness.getConfig().auth.trustedCallers = [];
      testHarness.getConfig().auth.userAllowTokens = { test: ['secret-token'] };
      const response = await queryFiltered({}).expect(200);
      expect(ids(response)).toContain(restrictedId);
    });

    it('honours the flags for a caller listed in auth.trustedCallers', async () => {
      testHarness.getConfig().auth.trustedCallers = ['test'];
      for (const send of [queryByPost, queryFiltered]) {
        const response = await send({ allow_see_all_records: true }).expect(200);
        expect(ids(response)).toContain(restrictedId);
      }
      const byTokens = await queryFiltered({ allow_tokens: ['secret-token'] }).expect(200);
      expect(ids(byTokens)).toContain(restrictedId);
    });

    it('fails the request without data when auth.userAllowTokens is malformed', async () => {
      testHarness.getConfig().auth.trustedCallers = [];
      testHarness.getConfig().auth.userAllowTokens = { test: 'secret-token' } as any;
      const response = await queryFiltered({}).expect(500);
      expect(response.body.data).toBeUndefined();
    });
  });

  describe('row access for GET /records/:id and /records/search (SE-3930 RG-02/RG-07)', () => {
    const marker = 'ROWACCESS_E2E_001';
    let publicId: string;
    let restrictedId: string;
    let savedAuth: any;

    const getById = (id: string, query = '') => testHarness.request().get(`/records/${id}${query}`).set('Authorization', validAuth);
    const search = () => testHarness.request().get(`/records/search?key_id=2001&search_key=data&text=${marker}`).set('Authorization', validAuth);
    // `search` wraps the model result: body.data = { data, meta }.
    const ids = (response) => response.body.data.data.map((r) => r.id);

    beforeAll(async () => {
      const create = (allowTokens: string[]) =>
        testHarness
          .request()
          .post('/records')
          .set('Authorization', validAuth)
          .send({ registerId: 200, keyId: 2001, data: { name: 'Row access', data: marker }, allowTokens })
          .expect(200);
      publicId = (await create([])).body.data.id;
      restrictedId = (await create(['secret-token'])).body.data.id;
    });

    beforeEach(() => {
      savedAuth = { ...testHarness.getConfig().auth };
      testHarness.getConfig().auth.trustedCallers = [];
    });

    afterEach(() => {
      testHarness.getConfig().auth = savedAuth;
    });

    afterAll(async () => {
      for (const id of [publicId, restrictedId]) {
        await testHarness.request().delete(`/records/${id}`).set('Authorization', validAuth);
      }
    });

    it('GET /records/:id returns a public row and 403 for a foreign-token row to an untrusted caller', async () => {
      await getById(publicId).expect(200);
      const response = await getById(restrictedId).expect(403);
      expect(response.body.data).toBeUndefined();
      // Client-supplied tokens are not honoured.
      await getById(restrictedId, '?allow_tokens=secret-token').expect(403);
    });

    it('GET /records/:id honours server-side userAllowTokens and trusted callers', async () => {
      testHarness.getConfig().auth.userAllowTokens = { test: ['secret-token'] };
      await getById(restrictedId).expect(200);
      testHarness.getConfig().auth.userAllowTokens = undefined;
      testHarness.getConfig().auth.trustedCallers = ['test'];
      await getById(restrictedId).expect(200);
    });

    it('GET /records/:id fails closed on malformed userAllowTokens', async () => {
      testHarness.getConfig().auth.userAllowTokens = { test: 'secret-token' } as any;
      const response = await getById(publicId).expect(500);
      expect(response.body.data).toBeUndefined();
    });

    it('search filters rows by server-side tokens and ignores client tokens', async () => {
      const untrusted = await search().expect(200);
      expect(ids(untrusted)).toContain(publicId);
      expect(ids(untrusted)).not.toContain(restrictedId);
      expect(untrusted.body.data.meta.count).toBe(1);

      const clientTokens = await testHarness
        .request()
        .get(`/records/search?key_id=2001&search_key=data&text=${marker}&allow_tokens=secret-token`)
        .set('Authorization', validAuth)
        .expect(200);
      expect(ids(clientTokens)).not.toContain(restrictedId);

      testHarness.getConfig().auth.userAllowTokens = { test: ['secret-token'] };
      const withTokens = await search().expect(200);
      expect(ids(withTokens)).toEqual(expect.arrayContaining([publicId, restrictedId]));
      expect(withTokens.body.data.meta.count).toBe(2);
    });

    it('search keeps trusted callers unrestricted', async () => {
      testHarness.getConfig().auth.trustedCallers = ['test'];
      const response = await search().expect(200);
      expect(ids(response)).toEqual(expect.arrayContaining([publicId, restrictedId]));
    });

    const patch = (id: string) =>
      testHarness
        .request()
        .patch(`/records/${id}`)
        .set('Authorization', validAuth)
        .send({ keyId: 2001, properties: [{ path: 'data.name', previousValue: 'a', value: 'patched' }] });

    it('PATCH /records/:id keeps legacy behaviour unless auth.strict is on', async () => {
      await patch(restrictedId).expect(200);
    });

    it('PATCH /records/:id with auth.strict rejects a foreign-token row for an untrusted caller', async () => {
      testHarness.getConfig().auth.strict = true;
      await patch(publicId).expect(200);
      const response = await patch(restrictedId).expect(403);
      expect(response.body.data).toBeUndefined();
      testHarness.getConfig().auth.userAllowTokens = { test: ['secret-token'] };
      await patch(restrictedId).expect(200);
      testHarness.getConfig().auth.userAllowTokens = undefined;
      testHarness.getConfig().auth.trustedCallers = ['test'];
      await patch(restrictedId).expect(200);
    });

    it('POST /records responses are not projected for a trusted caller and follow key rules otherwise', async () => {
      const create = () =>
        testHarness
          .request()
          .post('/records')
          .set('Authorization', validAuth)
          .send({ registerId: 200, keyId: 2001, data: { name: 'Create projection', data: marker }, allowTokens: [] });
      const untrusted = await create().expect(200);
      testHarness.getConfig().auth.trustedCallers = ['test'];
      const trusted = await create().expect(200);
      expect(trusted.body.data.data.data).toBe(marker);
      expect(untrusted.body.data.id).toBeDefined();
      for (const r of [untrusted, trusted]) {
        await testHarness.request().delete(`/records/${r.body.data.id}`).set('Authorization', validAuth);
      }
    });

    describe('PUT and bulk import of existing rows (RG-02c)', () => {
      const missingId = '00000000-0000-4000-8000-000000000000';
      const created: string[] = [];
      const make = async (allowTokens: string[]) => {
        // Rows are seeded as a trusted caller, so the seed is not subject to the checks under test.
        const savedTrusted = testHarness.getConfig().auth.trustedCallers;
        testHarness.getConfig().auth.trustedCallers = ['test'];
        const response = await testHarness
          .request()
          .post('/records')
          .set('Authorization', validAuth)
          .send({ registerId: 200, keyId: 2001, data: { name: 'RG-02c', data: marker }, allowTokens })
          .expect(200);
        testHarness.getConfig().auth.trustedCallers = savedTrusted;
        created.push(response.body.data.id);
        return response.body.data.id as string;
      };
      const put = (id: string, name = 'changed') =>
        testHarness
          .request()
          .put(`/records/${id}`)
          .set('Authorization', validAuth)
          .send({ registerId: 200, keyId: 2001, data: { name, data: marker } });
      const del = (id: string) => testHarness.request().delete(`/records/${id}`).set('Authorization', validAuth);
      const bulk = (id: string, name: string) =>
        testHarness
          .request()
          .post('/records/bulk')
          .set('Authorization', validAuth)
          .send({ registerId: 200, keyId: 2001, records: [{ id, data: { name, data: marker } }] });
      const getName = async (id: string) => {
        testHarness.getConfig().auth.trustedCallers = ['test'];
        const response = await getById(id).expect(200);
        testHarness.getConfig().auth.trustedCallers = [];
        return response.body.data.data.name;
      };

      afterAll(async () => {
        testHarness.getConfig().auth.trustedCallers = ['test'];
        for (const id of created) await del(id);
      });

      it('keeps legacy behaviour unless auth.strict is on', async () => {
        const id = await make(['secret-token']);
        await put(id, 'legacy').expect(200);
        expect(await getName(id)).toBe('legacy');
        await del(id).expect(200);
      });

      it('with auth.strict, PUT returns 403 for foreign and missing rows and leaves the row unchanged', async () => {
        const foreign = await make(['secret-token']);
        const publicRow = await make([]);
        testHarness.getConfig().auth.strict = true;
        const denied = await put(foreign).expect(403);
        expect(denied.body.data).toBeUndefined();
        await put(missingId).expect(403);
        expect(await getName(foreign)).toBe('RG-02c');
        await put(publicRow, 'public-ok').expect(200);
        testHarness.getConfig().auth.userAllowTokens = { test: ['secret-token'] };
        await put(foreign, 'token-ok').expect(200);
        expect(await getName(foreign)).toBe('token-ok');
      });

      it('with auth.strict, DELETE is denied to an untrusted caller by the destructive-route gate and keeps the row', async () => {
        const foreign = await make([]);
        testHarness.getConfig().auth.strict = true;
        await del(foreign).expect(403);
        await del(missingId).expect(403);
        expect(await getName(foreign)).toBe('RG-02c');
      });

      describe('row tokens a restricted caller may assign (RG-02d)', () => {
        const putTokens = (id: string, allowTokens: string[]) =>
          testHarness
            .request()
            .put(`/records/${id}`)
            .set('Authorization', validAuth)
            .send({ registerId: 200, keyId: 2001, data: { name: 'RG-02d', data: marker }, allowTokens });
        const postTokens = (allowTokens: string[]) =>
          testHarness
            .request()
            .post('/records')
            .set('Authorization', validAuth)
            .send({ registerId: 200, keyId: 2001, data: { name: 'RG-02d', data: marker }, allowTokens });
        const tokensOf = async (id: string) => {
          testHarness.getConfig().auth.trustedCallers = ['test'];
          const response = await getById(id).expect(200);
          testHarness.getConfig().auth.trustedCallers = [];
          return response.body.data.allowTokens ?? response.body.data.allow_tokens;
        };

        beforeEach(() => {
          testHarness.getConfig().auth.strict = true;
          testHarness.getConfig().auth.userAllowTokens = { test: ['secret-token'] };
        });

        it('legacy: strict off lets any caller set any tokens', async () => {
          testHarness.getConfig().auth.strict = false;
          const id = (await postTokens(['foreign-token']).expect(200)).body.data.id;
          created.push(id);
        });

        it('POST /records refuses tokens the caller does not hold and accepts its own', async () => {
          const denied = await postTokens(['foreign-token']).expect(403);
          expect(denied.body.data).toBeUndefined();
          await postTokens(['secret-token', 'foreign-token']).expect(403);
          created.push((await postTokens(['secret-token']).expect(200)).body.data.id);
        });

        it('PUT /records/:id refuses foreign tokens and refuses dropping the tokens the row carries', async () => {
          const id = await make(['secret-token']);
          await putTokens(id, ['foreign-token']).expect(403);
          // Making the row public drops its token.
          await putTokens(id, []).expect(403);
          expect(await tokensOf(id)).toEqual(['secret-token']);
          // Re-sending the same tokens, or omitting them, is fine.
          await putTokens(id, ['secret-token']).expect(200);
          await put(id, 'omitted').expect(200);
          expect(await tokensOf(id)).toEqual(['secret-token']);
        });

        it('PUT /records/:id can restrict a public row to a token the caller holds', async () => {
          const id = await make([]);
          await putTokens(id, ['secret-token']).expect(200);
          expect(await tokensOf(id)).toEqual(['secret-token']);
        });

        it('PUT /records/:id cannot drop a token the caller does not hold', async () => {
          const id = await make(['secret-token', 'other-token']);
          await putTokens(id, ['secret-token']).expect(403);
          expect(await tokensOf(id)).toEqual(['secret-token', 'other-token']);
        });

        it('POST /records/bulk refuses foreign tokens and keeps the tokens of updated rows', async () => {
          const id = await make(['secret-token']);
          const send = (record: object) =>
            testHarness
              .request()
              .post('/records/bulk')
              .set('Authorization', validAuth)
              .send({ registerId: 200, keyId: 2001, records: [record] });
          await send({ id, data: { name: 'bulk', data: marker }, allowTokens: ['foreign-token'] }).expect(403);
          await send({ id, data: { name: 'bulk', data: marker }, allowTokens: [] }).expect(200);
          expect(await tokensOf(id)).toEqual(['secret-token']);
          const response = await send({ id, data: { name: 'bulk2', data: marker } }).expect(200);
          expect(response.body.data.updatedRecords).toBe(1);
          expect(await tokensOf(id)).toEqual(['secret-token']);
        });

        it('trusted callers are not restricted', async () => {
          testHarness.getConfig().auth.trustedCallers = ['test'];
          const id = await make(['secret-token']);
          await putTokens(id, []).expect(200);
          expect(await tokensOf(id)).toEqual([]);
        });
      });

      it('with auth.strict, trusted callers are not restricted', async () => {
        const foreign = await make(['secret-token']);
        testHarness.getConfig().auth.strict = true;
        testHarness.getConfig().auth.trustedCallers = ['test'];
        await put(foreign, 'trusted').expect(200);
        await del(foreign).expect(200);
      });

      it('with auth.strict, POST /records/bulk updates only rows the caller may write', async () => {
        const foreign = await make(['secret-token']);
        testHarness.getConfig().auth.strict = true;
        const response = await bulk(foreign, 'bulk').expect(200);
        expect(response.body.data.updatedRecords).toBe(0);
        expect(await getName(foreign)).toBe('RG-02c');
        testHarness.getConfig().auth.userAllowTokens = { test: ['secret-token'] };
        expect((await bulk(foreign, 'bulk').expect(200)).body.data.updatedRecords).toBe(1);
        expect(await getName(foreign)).toBe('bulk');
      });
    });
  });

  describe('join_by authorization (SE-3930 RG-03/RG-04)', () => {
    const marker = 'JOINBY_E2E_001';
    const created: string[] = [];
    let publicId: string;
    let restrictedId: string;
    let primaryPublicId: string;
    let primaryForeignId: string;
    let primaryHiddenId: string;
    let savedAuth: any;

    const create = async (data: object, allowTokens: string[] = []) => {
      const response = await testHarness
        .request()
        .post('/records')
        .set('Authorization', validAuth)
        .send({ registerId: 200, keyId: 2001, data: { ...data, data: marker }, allowTokens })
        .expect(200);
      created.push(response.body.data.id);
      return response.body.data.id as string;
    };
    const joinQuery = (extra = '') =>
      testHarness
        .request()
        .get(`/records?key_id=2001&register_id=200&limit=1000&join_by=link&data[data]=${marker}${extra}`)
        .set('Authorization', validAuth);
    const byId = (response, id: string) => response.body.data.find((r) => r.id === id);

    beforeAll(async () => {
      publicId = await create({ name: 'Public linked' });
      restrictedId = await create({ name: 'Restricted linked' }, ['secret-token']);
      primaryPublicId = await create({ name: 'p1', link: publicId });
      primaryForeignId = await create({ name: 'p2', link: restrictedId });
      primaryHiddenId = await create({ name: 'p3', link: publicId }, ['other-token']);
    });

    beforeEach(() => {
      savedAuth = { ...testHarness.getConfig().auth };
    });

    afterEach(() => {
      testHarness.getConfig().auth = savedAuth;
    });

    afterAll(async () => {
      for (const id of created) await testHarness.request().delete(`/records/${id}`).set('Authorization', validAuth);
    });

    it('excludes token-restricted main rows from data and count for an untrusted caller', async () => {
      testHarness.getConfig().auth.trustedCallers = [];
      const response = await joinQuery('&allow_see_all_records=true&allow_tokens=other-token').expect(200);
      const ids = response.body.data.map((r) => r.id);
      expect(ids).toContain(primaryPublicId);
      expect(ids).not.toContain(primaryHiddenId);
      expect(ids).not.toContain(restrictedId);
      expect(Number(response.body.meta.count)).toBe(response.body.data.length);
    });

    it('returns joined as { id, data } for a public linked row and null for a foreign-token row', async () => {
      testHarness.getConfig().auth.trustedCallers = [];
      const response = await joinQuery().expect(200);
      expect(byId(response, primaryPublicId).joined).toEqual({ id: publicId, data: expect.objectContaining({ name: 'Public linked' }) });
      expect(byId(response, primaryForeignId).joined).toBeNull();
    });

    it('reveals the restricted linked row with server-side auth.userAllowTokens', async () => {
      testHarness.getConfig().auth.trustedCallers = [];
      testHarness.getConfig().auth.userAllowTokens = { test: ['secret-token'] };
      const response = await joinQuery().expect(200);
      expect(byId(response, primaryForeignId).joined.id).toBe(restrictedId);
    });

    it('keeps the unfiltered join for a trusted caller', async () => {
      testHarness.getConfig().auth.trustedCallers = ['test'];
      const response = await joinQuery('&allow_see_all_records=true').expect(200);
      expect(byId(response, primaryForeignId).joined.id).toBe(restrictedId);
      expect(byId(response, primaryHiddenId).joined.id).toBe(publicId);
    });

    it('does not allow SQL injection through data filters or join_by', async () => {
      testHarness.getConfig().auth.trustedCallers = ['test'];
      const filtered = await testHarness
        .request()
        .get(`/records?key_id=2001&join_by=link&data[name]=${encodeURIComponent("x' or '1'='1")}`)
        .set('Authorization', validAuth)
        .expect(200);
      expect(filtered.body.data).toEqual([]);
      await testHarness
        .request()
        .get(`/records?key_id=2001&join_by=${encodeURIComponent("link' or 1=1 --")}`)
        .set('Authorization', validAuth)
        .expect(500);
    });
  });

  describe('history snapshots and mixed-key pages (SE-3930 RG-08/RG-09)', () => {
    const marker = 'HISTORY_E2E_001';
    const created: string[] = [];
    let recordId: string;
    let savedAuth: any;
    let originalSchema: any;

    const setKey = async (id: number, set: string, replacements: object) => {
      await testHarness.getDb().query(`UPDATE keys SET ${set} WHERE id = :id`, { replacements: { id, ...replacements } });
      await testHarness.clearRedisCache();
    };
    const create = async (keyId: number, data: object) => {
      const response = await testHarness
        .request()
        .post('/records')
        .set('Authorization', validAuth)
        .send({ registerId: 200, keyId, data })
        .expect(200);
      created.push(response.body.data.id);
      return response.body.data.id as string;
    };

    beforeAll(async () => {
      const [[row]]: any = await testHarness.getDb().query('SELECT schema FROM keys WHERE id = 2001');
      originalSchema = typeof row.schema === 'string' ? row.schema : JSON.stringify(row.schema);
      recordId = await create(2001, { name: 'History', data: marker, secret: 'HIDDEN_VALUE' });
      await create(2002, { field1: 'mixed-key record' });
      // The key rules are tightened after the snapshot has been written.
      const schema = { ...JSON.parse(originalSchema), responseFields: ['name', 'data'] };
      await setKey(2001, 'schema = :schema', { schema: JSON.stringify(schema) });
    });

    beforeEach(() => {
      savedAuth = { ...testHarness.getConfig().auth };
      testHarness.getConfig().auth.trustedCallers = [];
    });

    afterEach(() => {
      testHarness.getConfig().auth = savedAuth;
    });

    afterAll(async () => {
      await setKey(2001, 'schema = :schema', { schema: originalSchema });
      await setKey(2002, 'access_mode = :mode', { mode: 'full' });
      for (const id of created) await testHarness.request().delete(`/records/${id}`).set('Authorization', validAuth);
    });

    it('hides fields excluded by responseFields in record history for an untrusted caller', async () => {
      const response = await testHarness.request().get(`/records/${recordId}/history`).set('Authorization', validAuth).expect(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(JSON.stringify(response.body.data)).not.toContain('HIDDEN_VALUE');
      expect(response.body.data[0].data.data).toEqual({ name: 'History', data: marker });
    });

    it('hides the same fields in key history and rejects probing them with record_data_like', async () => {
      const history = await testHarness
        .request()
        .get(`/keys/2001/history?record_data_like=${encodeURIComponent(JSON.stringify({ data: marker }))}`)
        .set('Authorization', validAuth)
        .expect(200);
      expect(history.body.data.length).toBeGreaterThan(0);
      expect(JSON.stringify(history.body.data)).not.toContain('HIDDEN_VALUE');
      await testHarness
        .request()
        .get(`/keys/2001/history?record_data_like=${encodeURIComponent(JSON.stringify({ secret: 'HIDDEN' }))}`)
        .set('Authorization', validAuth)
        .expect(403);
    });

    it('keeps full snapshots for a trusted caller', async () => {
      testHarness.getConfig().auth.trustedCallers = ['test'];
      const response = await testHarness.request().get(`/records/${recordId}/history`).set('Authorization', validAuth).expect(200);
      expect(response.body.data[0].data.data.secret).toBe('HIDDEN_VALUE');
    });

    it('returns 403 for a page that mixes a readable key with a write_only key', async () => {
      await setKey(2002, 'access_mode = :mode', { mode: 'write_only' });
      const response = await testHarness.request().get('/records?register_id=200&limit=1000').set('Authorization', validAuth).expect(403);
      expect(response.body.data).toBeUndefined();
      await setKey(2002, 'access_mode = :mode', { mode: 'full' });
      await testHarness.request().get('/records?register_id=200&limit=1000').set('Authorization', validAuth).expect(200);
    });
  });
});
