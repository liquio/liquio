import { TestHarness } from './test-harness';

describe('Records, keys, auth, history, access log (GITHUB-887 T08 B)', () => {
  let h: TestHarness;
  const auth = 'Basic dGVzdDp0ZXN0LXBhc3MtMTIzNA==';
  let registerId: number;
  let keyId: number;
  const ids: string[] = [];
  const api = () => h.request();
  const get = (url: string) => api().get(url).set('Authorization', auth);
  const post = (url: string, body: object = {}) => api().post(url).set('Authorization', auth).send(body);
  const put = (url: string, body: object = {}) => api().put(url).set('Authorization', auth).send(body);
  const del = (url: string, body?: object) => api().delete(url).set('Authorization', auth).send(body);
  const fn = '(record) => record.data.f';

  beforeAll(async () => {
    h = new TestHarness();
    await h.setup({ useDatabase: true, useRedis: true });
    await h.setupFixtures();
    const reg = await post('/registers', { name: 'B reg', description: 'b' }).expect(200);
    registerId = reg.body.data.id;
    const key = await post('/keys', {
      registerId,
      name: 'bk',
      description: 'b',
      schema: { type: 'object', properties: { f: { type: 'string' }, n: { type: 'number' } } },
      toString: fn,
      toSearchString: fn,
      toExport: '(record) => null',
    }).expect(200);
    keyId = key.body.data.id;
    for (const [f, n] of [
      ['alpha', 1],
      ['beta', 2],
      ['gamma', 3],
    ] as const) {
      const r = await post('/records', { registerId, keyId, data: { f, n }, meta: { m: f } }).expect(200);
      ids.push(r.body.data.id);
    }
  }, 30000);

  afterAll(async () => {
    await h.teardown();
  });

  describe('auth', () => {
    it('rejects wrong keyword', async () => {
      await api().get('/records').set('Authorization', 'Bearer abc').expect(401);
    });
    it('rejects token without colon', async () => {
      await api()
        .get('/records')
        .set('Authorization', `Basic ${Buffer.from('nocolon').toString('base64')}`)
        .expect(401);
    });
    it('rejects invalid access-info from trusted caller', async () => {
      const cfg = h.getConfig();
      const saved = cfg.auth.trustedCallers;
      cfg.auth.trustedCallers = ['test'];
      try {
        await get(`/records?key_id=${keyId}`).set('access-info', 'not-base64-json!!').expect(400);
        const info = Buffer.from(JSON.stringify({ name: 'Fake', age: 5, ok: true, nul: null, obj: { a: 1 } })).toString('base64');
        await get(`/records?key_id=${keyId}`).set('access-info', info).expect(200);
      } finally {
        cfg.auth.trustedCallers = saved;
      }
    });
    it('ignores access-info from untrusted caller', async () => {
      const info = Buffer.from(JSON.stringify({ name: 'Fake' })).toString('base64');
      await get(`/records?key_id=${keyId}`).set('access-info', info).expect(200);
    });
    it('enforces limited access', async () => {
      const cfg = h.getConfig();
      const saved = cfg.auth.limitedAccess;
      cfg.auth.limitedAccess = [{ user: 'test', keys: [String(keyId)] }];
      try {
        await post('/records', { registerId, keyId, data: { f: 'x' } }).expect(401);
        await get('/records?key_id=99999').expect(401);
        await get(`/records?key_id=${keyId}`).expect(200);
      } finally {
        cfg.auth.limitedAccess = saved;
      }
    });
  });

  describe('keys', () => {
    it('lists, gets and 404s', async () => {
      const list = await get(`/keys?register_id=${registerId}`).expect(200);
      expect(list.body.data.length).toBeGreaterThan(0);
      await get(`/keys/${keyId}`).expect(200);
      await get('/keys/99999999').expect(404);
    });
    it('synced and allSynced', async () => {
      await get(`/keys/synced?ids=${keyId}`).expect(200);
      await get('/keys/synced?ids=0').expect(403);
      await get('/keys/allSynced').expect(200);
    });
    it('history of key', async () => {
      await get(`/keys/${keyId}/history`).expect(200);
      await get('/keys/99999999/history').expect(403);
    });
    it('update key and 404', async () => {
      const u = await put(`/keys/${keyId}`, { name: 'bk2', description: 'b2' });
      expect(u.status).toBe(200);
      await put('/keys/99999999', { name: 'x', description: 'x' }).expect(404);
    });
    it('reindex', async () => {
      await post(`/keys/${keyId}/reindex`, {}).expect(200);
      await post('/keys/99999999/reindex', {}).expect(404);
    });
    it('afterhandlers-reindex', async () => {
      const r = await post(`/keys/${keyId}/afterhandlers-reindex`, {});
      expect(r.status).toBe(202);
    });
    it('process-encryption', async () => {
      const r = await post(`/keys/${keyId}/process-encryption`, {});
      expect(r.status).toBe(200);
      await post('/keys/99999999/process-encryption', {}).expect(404);
    });
    it('delete 404', async () => {
      await del('/keys/99999999').expect(500);
    });
    it('create with invalid body', async () => {
      await post('/keys', { name: 'no register' }).expect(422);
    });
  });

  describe('records read', () => {
    it('filters by many query params', async () => {
      const q = [`key_id=${keyId}`, 'limit=2', 'offset=0', 'sort[data.n]=desc', `data[f]=alpha`];
      const r = await get(`/records?${q.join('&')}`).expect(200);
      expect(r.body.data.length).toBe(1);
      await get(`/records?key_id=${keyId}&search=alp`).expect(200);
      await get(`/records?key_id=${keyId}&search_equal=alpha`).expect(200);
      await get(`/records?key_id=${keyId}&data_like[f]=alp`).expect(200);
      await get(`/records?key_id=${keyId}&meta[m]=beta`).expect(200);
      await get(`/records?key_id=${keyId}&no_limit=true`).expect(200);
      await get(`/records?key_id=${keyId}&created_from=2000-01-01&created_to=2100-01-01&updated_from=2000-01-01&updated_to=2100-01-01`).expect(200);
      await get(`/records?key_id=${keyId}&created_by=nobody`).expect(200);
      await get(`/records?key_id=${keyId}&record_id=${ids[0]}`).expect(200);
      await get(`/records?key_id=${keyId}&exclude=${encodeURIComponent(JSON.stringify({ f: ['alpha'] }))}`).expect(200);
      await get(`/records?key_id=${keyId}&exclude=nojson`).expect(400);
      await get(`/records?key_id=${keyId}&record_ids_list=${encodeURIComponent(JSON.stringify([ids[0]]))}`).expect(200);
      await get(`/records?key_id=${keyId}&data_nested=${encodeURIComponent(JSON.stringify({ type: 'contains', value: { f: 'alpha' } }))}`).expect(
        200,
      );
      const incl = encodeURIComponent(JSON.stringify({ type: 'includes', value: { f: ['alpha'] } }));
      await get(`/records?key_id=${keyId}&data_nested=${incl}`).expect(200);
      await get(`/records?key_id=${keyId}&data_nested=${encodeURIComponent(JSON.stringify({ type: 'bad', value: {} }))}`).expect(400);
      await get(`/records?key_id=${keyId}&data_nested=nojson`).expect(400);
      await get(`/records?key_id=${keyId}&paths=f`).expect(200);
      await get(`/records?register_id=${registerId}&allow_see_all_records=true&disable_fields_rules=true`).expect(200);
    });
    it('records-by-post', async () => {
      const r = await post('/records-by-post', { key_id: keyId, data: { f: 'beta' }, limit: 5 }).expect(200);
      expect(r.body.data.length).toBe(1);
    });
    it('search', async () => {
      const r = await get(`/records/search?keyId=${keyId}&search=alp`);
      expect(r.status).toBe(422);
      const r2 = await get(`/records/search?key_id=${keyId}&search=alp`);
      expect(r2.status).toBe(422);
    });
    it('filter endpoint', async () => {
      const r = await post('/records/filter', { key_id: keyId, data: { f: 'gamma' }, limit: 5 });
      expect(r.status).toBe(200);
      const r2 = await post('/records/filter', { key_id: keyId, search: 'gam', sort: { f: 'asc' }, additional_filter: {} });
      expect(r2.status).toBe(500); // current behaviour, see BUGS.md
    });
    it('find by id, with paths and 404', async () => {
      const r = await get(`/records/${ids[0]}`).expect(200);
      expect(r.body.data.data.f).toBe('alpha');
      await get(`/records/${ids[0]}?paths=f`).expect(200);
      await get('/records/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });

  describe('records write and history', () => {
    let id: string;
    it('creates, updates (PUT) and records history', async () => {
      const c = await post('/records', { registerId, keyId, data: { f: 'h1', n: 10 }, meta: { a: 1 } }).expect(200);
      id = c.body.data.id;
      await put(`/records/${id}`, { registerId, keyId, data: { f: 'h2', n: 11, extra: 'e' }, meta: { a: 2 } }).expect(200);
      await put(`/records/${id}`, { registerId, keyId, data: { f: 'h3' }, meta: { a: 3 } }).expect(200);
      const h1 = await get(`/records/${id}/history`).expect(200);
      expect(h1.body.data.length).toBeGreaterThanOrEqual(3);
    });
    it('history variants', async () => {
      await get(`/records/${id}/history?split_by_fields=true`).expect(200);
      await get(`/records/${id}/history?split_by_fields=true&split_by_fields_order=desc&limit=5&offset=0`).expect(200);
      await get(`/records/${id}/history?operation=update`).expect(200);
      await get('/records/00000000-0000-0000-0000-000000000000/history').expect(200);
    });
    it('PUT 404 and validation', async () => {
      await put('/records/00000000-0000-0000-0000-000000000000', { registerId, keyId, data: { f: 'z' } }).expect(500);
      await put(`/records/${id}`, { registerId, keyId, data: { f: 123 } }).expect(400);
    });
    it('create validation errors', async () => {
      await post('/records', { registerId, keyId, data: { f: 123 } }).expect(400);
      await post('/records', { registerId, keyId: 99999999, data: { f: 'a' } }).expect(404);
      await post('/records', { data: {} }).expect(422);
    });
    it('delete and 404', async () => {
      await del(`/records/${id}`).expect(200);
      await get(`/records/${id}`).expect(404);
      await del('/records/00000000-0000-0000-0000-000000000000').expect(500);
    });
  });

  describe('records bulk', () => {
    it('bulk import', async () => {
      const records = [1, 2, 3].map((i) => ({ data: { f: `bulk${i}`, n: i }, meta: {} }));
      const r = await post('/records/bulk', { registerId, keyId, records, isReturnCreatedRecords: true });
      expect(r.status).toBe(200);
      const r2 = await post('/records/bulk', { registerId, keyId, records: [{ data: { f: 5 } }] });
      expect(r2.status).toBe(200);
      await post('/records/bulk', { registerId, keyId: 99999999, records }).expect(400);
    });
    it('bulk import background and update by field', async () => {
      const records = [{ data: { f: 'bulk1', n: 9 }, meta: {} }];
      const r = await post('/records/bulk', { registerId, keyId, records, updateByDataField: 'f', isCalculateSearchStrings: true });
      expect(r.status).toBe(200);
      const r2 = await post('/records/bulk', { registerId, keyId, records, background: true });
      expect(r2.status).toBe(202);
    });
    it('bulk-by-person', async () => {
      const r = await post('/records/bulk-by-person', {
        registerId,
        keyId,
        recordsData: [{ f: 'p1', n: 1 }],
        person: { name: 'Fake Person' },
      });
      expect(r.status).toBe(200);
      await post('/records/bulk-by-person', { registerId, keyId }).expect(422);
    });
    it('delete bulk', async () => {
      await del('/records/bulk', { registerId, keyId: 99999999, skipRecordIds: [] }).expect(400);
      const r = await del('/records/bulk', { registerId, keyId, skipRecordIds: ids });
      expect(r.status).toBe(200);
      const left = await get(`/records?key_id=${keyId}&no_limit=true`).expect(200);
      expect(left.body.data.length).toBe(3);
    });
  });

  describe('records extra paths', () => {
    const patch = (id: string, body: object) => api().patch(`/records/${id}`).set('Authorization', auth).send(body);
    it('PATCH validates paths and values', async () => {
      await patch(ids[0], { keyId, properties: [{ path: 'meta.x', previousValue: 'a', value: 'b' }] }).expect(400);
      await patch(ids[0], { keyId, properties: [{ path: 'data', previousValue: 'a', value: 'b' }] }).expect(400);
      await patch(ids[0], { keyId, properties: [{ path: 'data.f', previousValue: 'alpha', value: 'alpha2' }] }).expect(200);
      const r = await get(`/records/${ids[0]}`).expect(200);
      expect(r.body.data.data.f).toBe('alpha2');
      await patch(ids[0], { keyId }).expect(422);
    });
    it('OR filters and wrong values', async () => {
      const or = encodeURIComponent(JSON.stringify({ _filters_type: 'or', 'f|1': 'beta', 'f|2': 'gamma' }));
      const r = await get(`/records?key_id=${keyId}&data=${or}`);
      expect(r.status).toBe(200);
      const q = await get(`/records?key_id=${keyId}&data[f]=nothing&data[n]=1&data[f]=beta`);
      expect(q.status).toBe(200);
    });
    it('filter endpoint with data, csv_map, or and wrong values', async () => {
      const csvMap = JSON.stringify({ f: 'F' });
      const calls = [
        post('/records/filter', { key_id: keyId, data: { f: 'beta' }, limit: 5 }),
        post('/records/filter', { key_id: keyId, data: { _filters_type: 'or', 'f|1': 'beta', 'f|2': 'gamma' } }),
        post('/records/filter', { key_id: keyId, data: { f: 'null' } }),
        post('/records/filter', { key_id: keyId, meta: { m: 'beta' }, data_like: { f: 'bet' } }),
        post('/records/filter', { key_id: keyId, csv_map: csvMap, no_limit: true }),
        post('/records/filter', { key_id: keyId, additionalFilter: Buffer.from('{}').toString('base64'), additionalFilterData: {} }),
        post('/records/filter', { register_id: registerId, allow_see_all_records: true, created_from: '2000-01-01', sort: { 'data.n': 'asc' } }),
        post('/records/filter', { key_id: 99999999 }),
      ];
      const statuses = (await Promise.all(calls)).map((r) => r.status);
      // Index 5 (additionalFilter of '{}' in base64) currently answers 500; index 7 is a key that is not readable.
      expect(statuses).toEqual([200, 200, 200, 200, 200, 500, 200, 403]);
    });
    it('GET with csv_map and additional_filter and records-by-post variants', async () => {
      const csvMap = encodeURIComponent(JSON.stringify({ f: 'F' }));
      const calls = [
        get(`/records?key_id=${keyId}&csv_map=${csvMap}&no_limit=true`),
        get(`/records?key_id=${keyId}&additional_filter=${encodeURIComponent(Buffer.from('{}').toString('base64'))}`),
        get(`/records?key_id=${keyId}&search_2=a&search_3=b`),
        post('/records-by-post', { key_id: keyId, search: 'a' }),
        post('/records-by-post', { key_id: keyId, additional_filter: Buffer.from('{}').toString('base64') }),
      ];
      const statuses = (await Promise.all(calls)).map((r) => r.status);
      expect(statuses).toEqual([200, 200, 200, 200, 200]);
    });
    it('bulk-by-person creates records', async () => {
      const r = await post('/records/bulk-by-person', {
        registerId,
        keyId,
        recordsData: [
          { f: 'p1', n: 1 },
          { f: 'p2', n: 2 },
        ],
        person: { name: 'Fake Person' },
      });
      expect(r.status).toBe(200);
      await post('/records/bulk-by-person', { registerId, keyId, recordsData: [{ f: 'p3' }], person: {}, isDisableHooks: true }).expect(200);
      await post('/records/bulk-by-person', { registerId, keyId, recordsData: ['bad'], person: {} }).expect(500);
      await post('/records/bulk-by-person', { registerId: 99999999, keyId, recordsData: [{ f: 'p' }], person: {} }).expect(400);
    });
    it('key update, encrypted-key reindex status and create variants', async () => {
      const k = await post('/keys', {
        registerId,
        name: 'bk-enc',
        description: 'e',
        schema: { type: 'object', properties: { f: { type: 'string' } } },
        toString: fn,
        toSearchString: fn,
        toExport: '(record) => null',
        meta: { a: 1 },
      }).expect(200);
      const id = k.body.data.id;
      await put(`/keys/${id}`, { name: 'bk-enc2', description: 'e2', meta: { a: 2 } }).expect(200);
      await put(`/keys/${id}`, { name: 'bk-enc2', description: 'e2', toSearchString: '(' }).expect(200);
      await get(`/keys/${id}/history`).expect(200);
      await get(`/keys?register_id=${registerId}&limit=1&offset=0`).expect(200);
      await del(`/keys/${id}`).expect(200);
    });
  });

  describe('access log', () => {
    it('lists with filters', async () => {
      await get('/access-log').expect(200);
      await get('/access-log?limit=5&offset=0&key_id=1&record_id=abc').expect(200);
      await get('/access-log?created_from=2000-01-01&created_to=2100-01-01').expect(200);
      await get('/access-log?created_from=2000-01-01T00:00:00.000Z&created_to=2100-01-01T00:00:00.000Z').expect(200);
    });
  });
});
