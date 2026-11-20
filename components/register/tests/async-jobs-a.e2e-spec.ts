import { TestHarness } from './test-harness';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Import, export and rollback jobs (GITHUB-887 T08 A)', () => {
  let h: TestHarness;
  const auth = 'Basic dGVzdDp0ZXN0LXBhc3MtMTIzNA==';
  const schema = { type: 'object', properties: { f: { type: 'string' } } };
  const fn = '(record) => record.data.f';
  let savedAuth: any;
  const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const api = () => h.request();

  const poll = async (url: string, done: string[]) => {
    for (let i = 0; i < 60; i++) {
      const r = await api().get(url).set('Authorization', auth).expect(200);
      if (done.includes(r.body.data.status)) return r.body.data;
      await sleep(100);
    }
    throw new Error(`timeout polling ${url}`);
  };
  const keyOf = (id: number, registerId: number, extra: object = {}) => ({
    id,
    registerId,
    name: `k${id}`,
    description: 'k',
    schema,
    toString: fn,
    toSearchString: fn,
    toExport: '(record) => null',
    ...extra,
  });
  const regOf = (id: number) => ({ id, name: `r${id}`, description: 'r' });
  const recOf = (n: number, registerId: number, keyId: number, f: string) => ({ id: uuid(n), registerId, keyId, data: { f }, searchString: f });

  beforeAll(async () => {
    h = new TestHarness();
    await h.setup({ useDatabase: true, useRedis: true });
    await h.setupFixtures();
    savedAuth = { ...h.getConfig().auth };
    h.getConfig().auth.trustedCallers = ['test'];
  }, 30000);

  afterAll(async () => {
    h.getConfig().auth = savedAuth;
    await h.teardown();
  });

  describe('POST /import/start', () => {
    it('imports schema and records, then replaces old records on re-import', async () => {
      const start = await api()
        .post('/import/start')
        .set('Authorization', auth)
        .send({ register: regOf(8100), key: keyOf(81001, 8100), records: [recOf(1, 8100, 81001, 'a'), recOf(2, 8100, 81001, 'b')] })
        .expect(200);
      expect(start.body.data).toMatchObject({ keyId: 81001, registerId: 8100, recordsCount: 2 });
      const status = await poll(`/import/${start.body.data.importId}/status`, ['Imported', 'Failed']);
      expect(status.status).toBe('Imported');
      expect(status.details.importProgressPercent).toBe(100);

      const again = await api()
        .post('/import/start')
        .set('Authorization', auth)
        .send({ register: regOf(8100), key: keyOf(81001, 8100), records: [recOf(1, 8100, 81001, 'a2'), recOf(3, 8100, 81001, 'c')] })
        .expect(200);
      const status2 = await poll(`/import/${again.body.data.importId}/status`, ['Imported', 'Failed']);
      expect(status2.status).toBe('Imported');
      await api()
        .get(`/records/${uuid(2)}`)
        .set('Authorization', auth)
        .expect(404);
      const kept = await api()
        .get(`/records/${uuid(1)}`)
        .set('Authorization', auth)
        .expect(200);
      expect(kept.body.data.data.f).toBe('a2');
    });

    it('imports only the schema', async () => {
      const start = await api()
        .post('/import/start')
        .set('Authorization', auth)
        .send({ register: regOf(8101), key: keyOf(81011, 8101), options: { onlySchema: true } })
        .expect(200);
      const status = await poll(`/import/${start.body.data.importId}/status`, ['Imported', 'Failed']);
      expect(status.status).toBe('Imported');
      expect(status.details.importedKeySchema).toBe(true);
    });

    it('marks the job Failed when the key belongs to another register', async () => {
      const start = await api()
        .post('/import/start')
        .set('Authorization', auth)
        .send({ register: regOf(8102), key: keyOf(81001, 8102), options: { onlySchema: true } })
        .expect(200);
      const status = await poll(`/import/${start.body.data.importId}/status`, ['Imported', 'Failed']);
      expect(status.status).toBe('Failed');
      expect(status.details.error).toBe('Import failed.');
    });

    it('marks the job Failed when existing records break the new key schema', async () => {
      const strict = { type: 'object', properties: { f: { type: 'string' } }, required: ['g'] };
      const start = await api()
        .post('/import/start')
        .set('Authorization', auth)
        .send({ register: regOf(8100), key: keyOf(81001, 8100, { schema: strict }), options: { onlySchema: true } })
        .expect(200);
      const status = await poll(`/import/${start.body.data.importId}/status`, ['Imported', 'Failed']);
      expect(status.status).toBe('Failed');
    });

    it('marks the job Failed when the encryption state changes', async () => {
      const start = await api()
        .post('/import/start')
        .set('Authorization', auth)
        .send({ register: regOf(8100), key: keyOf(81001, 8100, { isEncrypted: true }), options: { onlySchema: true } })
        .expect(200);
      const status = await poll(`/import/${start.body.data.importId}/status`, ['Imported', 'Failed']);
      expect(status.status).toBe('Failed');
    });

    it.each([
      ['missing register', { key: keyOf(1, 1), records: [] }],
      ['missing key', { register: regOf(1), records: [] }],
      ['unrelated key and register', { register: regOf(2), key: keyOf(1, 1), records: [] }],
      ['missing records', { register: regOf(1), key: keyOf(1, 1) }],
      ['records not an array', { register: regOf(1), key: keyOf(1, 1), records: {} }],
      ['record without id', { register: regOf(1), key: keyOf(1, 1), records: [{ registerId: 1, keyId: 1 }] }],
      ['record of another register', { register: regOf(1), key: keyOf(1, 1), records: [{ id: uuid(9), registerId: 2, keyId: 1 }] }],
      ['record of another key', { register: regOf(1), key: keyOf(1, 1), records: [{ id: uuid(9), registerId: 1, keyId: 2 }] }],
    ])('returns 500 for %s', async (_name, body) => {
      await api().post('/import/start').set('Authorization', auth).send(body).expect(500);
    });

    it('returns 500 for the status of an unknown import', async () => {
      await api().get('/import/unknown-import-id/status').set('Authorization', auth).expect(500);
    });
  });

  describe('export jobs', () => {
    it('prepares and returns full key data', async () => {
      const start = await api().post('/export/start-preparing').set('Authorization', auth).send({ keyId: 81001 }).expect(200);
      expect(start.body.data.keyId).toBe(81001);
      const { exportId } = start.body.data;
      const status = await poll(`/export/${exportId}/status`, ['Prepared', 'Failed']);
      expect(status.status).toBe('Prepared');
      const data = await api().get(`/export/${exportId}/data`).set('Authorization', auth).expect(200);
      expect(data.headers['content-disposition']).toContain('register-8100-81001.dat');
      const parsed = typeof data.body === 'object' && data.body.key ? data.body : JSON.parse(data.text);
      expect(parsed.records.length).toBe(2);
    });

    it('prepares schema only', async () => {
      const start = await api()
        .post('/export/start-preparing')
        .set('Authorization', auth)
        .send({ keyId: 81001, options: { onlySchema: true } })
        .expect(200);
      const { exportId } = start.body.data;
      await poll(`/export/${exportId}/status`, ['Prepared', 'Failed']);
      const data = await api().get(`/export/${exportId}/data`).set('Authorization', auth).expect(200);
      expect(data.headers['content-disposition']).toContain('register-schema-8100-81001.dat');
    });

    it('prepares a projected export for a non-trusted caller', async () => {
      h.getConfig().auth.trustedCallers = [];
      try {
        const start = await api().post('/export/start-preparing').set('Authorization', auth).send({ keyId: 81001 }).expect(200);
        await poll(`/export/${start.body.data.exportId}/status`, ['Prepared', 'Failed']);
      } finally {
        h.getConfig().auth.trustedCallers = ['test'];
      }
    });

    it('rejects a write-only key for a non-trusted caller with 403', async () => {
      await h.getDb().query("UPDATE keys SET access_mode = 'write_only' WHERE id = 81001");
      await h.clearRedisCache();
      h.getConfig().auth.trustedCallers = [];
      try {
        await api().post('/export/start-preparing').set('Authorization', auth).send({ keyId: 81001 }).expect(403);
      } finally {
        h.getConfig().auth.trustedCallers = ['test'];
        await h.getDb().query("UPDATE keys SET access_mode = 'full' WHERE id = 81001");
        await h.clearRedisCache();
      }
    });

    it('returns 500 for an unknown key', async () => {
      await api().post('/export/start-preparing').set('Authorization', auth).send({ keyId: 987654 }).expect(500);
    });

    it('answers an unknown export with no status and a 500 for its data', async () => {
      const r = await api().get('/export/unknown-export-id/status').set('Authorization', auth).expect(200);
      expect(r.body.data).toEqual({ exportId: 'unknown-export-id' });
      await api().get('/export/unknown-export-id/data').set('Authorization', auth).expect(500);
    });
  });

  describe('rollback', () => {
    const keyId = 81001;
    const registerId = 8100;

    it('rolls a key back to a time point', async () => {
      await sleep(50);
      const timePoint = new Date().toJSON();
      await sleep(50);
      await api()
        .put(`/records/${uuid(1)}`)
        .set('Authorization', auth)
        .send({ registerId, keyId, data: { f: 'changed' } })
        .expect(200);
      await api()
        .delete(`/records/${uuid(3)}`)
        .set('Authorization', auth)
        .expect(200);
      const created = await api()
        .post('/records')
        .set('Authorization', auth)
        .send({ registerId, keyId, data: { f: 'new' } })
        .expect(200);

      const start = await api().post('/rollback/start').set('Authorization', auth).send({ keyId, timePoint }).expect(200);
      const { rollbackId } = start.body.data;
      const status = await poll(`/rollback/${rollbackId}/status`, ['Rollbacked', 'Failed']);
      expect(status.status).toBe('Rollbacked');

      await api().get(`/records/${created.body.data.id}`).set('Authorization', auth).expect(404);
      const restored = await api()
        .get(`/records/${uuid(1)}`)
        .set('Authorization', auth)
        .expect(200);
      expect(restored.body.data.data.f).toBe('a2');
      await api()
        .get(`/records/${uuid(3)}`)
        .set('Authorization', auth)
        .expect(200);
    });

    it.each([
      ['bad time point format', { keyId, timePoint: '2024-01-01' }],
      ['time point older than a week', { keyId, timePoint: '2000-01-01T00:00:00.000Z' }],
      ['unknown key', { keyId: 987654, timePoint: new Date().toJSON() }],
    ])('returns 500 on start for %s', async (_name, body) => {
      await api().post('/rollback/start').set('Authorization', auth).send(body).expect(500);
    });

    it('returns 422 on start without a time point', async () => {
      await api().post('/rollback/start').set('Authorization', auth).send({ keyId }).expect(422);
    });

    it('answers an unknown rollback with no status', async () => {
      const r = await api().get('/rollback/unknown-rollback-id/status').set('Authorization', auth).expect(200);
      expect(r.body.data).toEqual({ rollbackId: 'unknown-rollback-id' });
    });

    it('rolls back a single record to a history row', async () => {
      const history = await api()
        .get(`/records/${uuid(1)}/history`)
        .set('Authorization', auth)
        .expect(200);
      const oldest = history.body.data[history.body.data.length - 1];
      const r = await api()
        .post('/rollback/record')
        .set('Authorization', auth)
        .send({ historyId: oldest.id, recordId: uuid(1), keyId })
        .expect(200);
      expect(r.body.data.rollbackedRecord).toBeDefined();
    });

    it('recreates a deleted record from its history row', async () => {
      const created = await api()
        .post('/records')
        .set('Authorization', auth)
        .send({ registerId, keyId, data: { f: 'gone' } })
        .expect(200);
      const id = created.body.data.id;
      const history = await api().get(`/records/${id}/history`).set('Authorization', auth).expect(200);
      const historyId = history.body.data[0].id;
      await api().delete(`/records/${id}`).set('Authorization', auth).expect(200);
      await api().get(`/records/${id}`).set('Authorization', auth).expect(404);
      await api().post('/rollback/record').set('Authorization', auth).send({ historyId, recordId: id, keyId }).expect(200);
      const back = await api().get(`/records/${id}`).set('Authorization', auth).expect(200);
      expect(back.body.data.data.f).toBe('gone');
    });

    it('returns 500 when the history row belongs to another record', async () => {
      const history = await api()
        .get(`/records/${uuid(1)}/history`)
        .set('Authorization', auth)
        .expect(200);
      await api()
        .post('/rollback/record')
        .set('Authorization', auth)
        .send({ historyId: history.body.data[0].id, recordId: uuid(3), keyId })
        .expect(500);
    });

    it('returns 500 for a missing history row', async () => {
      await api()
        .post('/rollback/record')
        .set('Authorization', auth)
        .send({ historyId: uuid(777), recordId: uuid(1), keyId })
        .expect(500);
    });
  });
  describe('GET /custom/post-code (address lookup over imported dictionaries)', () => {
    const query = '/custom/post-code?regionName=Testregion&districtName=Testdistrict&cityName=Testcity&streetName=Teststreet&buildingNumber=5';

    it('returns empty lookups when no dictionary data exists', async () => {
      const r = await api().get(query).set('Authorization', auth).expect(200);
      expect(r.body.data).toMatchObject({ regionIds: [], cityIds: [], postalCodes: [] });
    });

    it('resolves region, city and postal code', async () => {
      const dict = async (keyId: number, records: object[]) => {
        const job = await api()
          .post('/import/start')
          .set('Authorization', auth)
          .send({
            register: regOf(8200),
            key: keyOf(keyId, 8200),
            records: records.map((rec: any, i) => ({ id: uuid(keyId * 10 + i), registerId: 8200, keyId, ...rec })),
          })
          .expect(200);
        expect((await poll(`/import/${job.body.data.importId}/status`, ['Imported', 'Failed'])).status).toBe('Imported');
      };
      await dict(374, [{ data: { id: 'r1', name: 'Testregion' } }]);
      await dict(375, [{ data: { id: 'c1', regionId: 'r1', district: 'Testdistrict', name: 'Testcity' } }]);
      await dict(376, [{ data: { id: 's1', cityId: 'c1', name: 'Teststreet', buildings: [{ number: '5', postalCode: '12345' }] } }]);
      const r = await api().get(query).set('Authorization', auth).expect(200);
      expect(r.body.data).toMatchObject({ regionIds: ['r1'], cityIds: ['c1'], postalCodes: ['12345'] });
    });
  });
});
