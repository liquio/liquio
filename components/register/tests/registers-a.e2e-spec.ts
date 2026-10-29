import { TestHarness } from './test-harness';

// The controller declares its separators as type annotations only, so at runtime both are undefined and export writes 'undefined'.
const SEP = 'undefined';

const multipart = (payload: string) =>
  `------WebKitFormBoundaryA\r\nContent-Disposition: form-data; name="file"; filename="a.dat"\r\nContent-Type: application/octet-stream\r\n\r\n${payload}\r\n------WebKitFormBoundaryA--\r\n`;

describe('RegistersController export/import (GITHUB-887 T08 A)', () => {
  let h: TestHarness;
  const auth = 'Basic dGVzdDp0ZXN0LXBhc3MtMTIzNA==';
  const savedTrusted: string[] = [];
  let registerId: number;
  let keyId: number;

  const api = () => h.request();
  const keyStruct = (id: number, extra: object = {}) => ({
    id,
    name: `A key ${id}`,
    description: 'a key',
    schema: { type: 'object', properties: { f: { type: 'string' } } },
    meta: {},
    toString: '(record) => record.data.f',
    toSearchString: '(record) => record.data.f',
    toExport: '(record) => null',
    ...extra,
  });

  beforeAll(async () => {
    h = new TestHarness();
    await h.setup({ useDatabase: true, useRedis: true });
    await h.setupFixtures();
    savedTrusted.push(...(h.getConfig().auth.trustedCallers || []));
    h.getConfig().auth.trustedCallers = ['test'];
    const reg = await api().post('/registers').set('Authorization', auth).send({ name: 'A reg', description: 'a' }).expect(200);
    registerId = reg.body.data.id;
    const key = await api()
      .post('/keys')
      .set('Authorization', auth)
      .send({
        registerId,
        name: 'k1',
        description: 'k',
        schema: { type: 'object', properties: { f: { type: 'string' } } },
        toString: '(record) => record.data.f',
        toSearchString: '(record) => record.data.f',
        toExport: '(record) => null',
      })
      .expect(200);
    keyId = key.body.data.id;
    for (const f of ['one', 'two']) {
      const r = await api().post('/records').set('Authorization', auth).send({ registerId, keyId, data: { f } }).expect(200);
      expect(r.body.data.id).toBeDefined();
    }
  }, 30000);

  afterAll(async () => {
    h.getConfig().auth.trustedCallers = savedTrusted;
    await h.teardown();
  });

  describe('GET /registers/:id/export', () => {
    it('returns the register structure without data', async () => {
      const r = await api().get(`/registers/${registerId}/export?with_data=false`).set('Authorization', auth).expect(200);
      expect(r.body.data.id).toBe(registerId);
      expect(r.body.data.keys.count).toBe(1);
      expect(r.body.data.keys.data[0].records).toBeUndefined();
    });

    it('returns records with data for a trusted caller', async () => {
      const r = await api().get(`/registers/${registerId}/export?with_data=true`).set('Authorization', auth).expect(200);
      expect(r.body.data.keys.data[0].records.count).toBe(2);
    });

    it('filters keys by key_ids', async () => {
      const r = await api().get(`/registers/${registerId}/export?with_data=false&key_ids=999999`).set('Authorization', auth).expect(200);
      expect(r.body.data.keys.count).toBe(0);
    });

    it('returns projected output for a non-trusted caller', async () => {
      h.getConfig().auth.trustedCallers = [];
      try {
        await api().get(`/registers/${registerId}/export?with_data=true`).set('Authorization', auth).expect(200);
      } finally {
        h.getConfig().auth.trustedCallers = ['test'];
      }
    });

    it('returns a file attachment', async () => {
      const r = await api().get(`/registers/${registerId}/export?with_data=true&file=true`).set('Authorization', auth).expect(200);
      expect(r.headers['content-disposition']).toContain(`register-${registerId}.dat`);
      expect(r.text.split('\n').filter(Boolean).length).toBe(3);
    });

    it('returns 404 for an unknown register', async () => {
      await api().get('/registers/999999/export?with_data=false').set('Authorization', auth).expect(404);
    });

    it('returns 422 when with_data is missing', async () => {
      await api().get(`/registers/${registerId}/export`).set('Authorization', auth).expect(422);
    });

    it('returns 403 when the record count exceeds the export limit', async () => {
      const cfg = h.getConfig();
      const old = cfg.pagination.maxExportLimit;
      cfg.pagination.maxExportLimit = 1;
      try {
        await api().get(`/registers/${registerId}/export?with_data=true`).set('Authorization', auth).expect(403);
      } finally {
        cfg.pagination.maxExportLimit = old;
      }
    });
  });

  describe('GET /registers/:id/stream-export', () => {
    it('streams structure and records', async () => {
      const r = await api().get(`/registers/${registerId}/stream-export?with_data=true&file=true`).set('Authorization', auth).expect(200);
      expect(r.text.split(SEP).length).toBe(4);
      expect(r.text).toContain('"f":"one"');
    });

    it('streams the structure only', async () => {
      const r = await api().get(`/registers/${registerId}/stream-export?with_data=false`).set('Authorization', auth).expect(200);
      expect(r.text.split(SEP).length).toBe(2);
    });

    it('returns 404 for an unknown register', async () => {
      await api().get('/registers/999999/stream-export?with_data=false').set('Authorization', auth).expect(404);
    });

    it('streams projected output for a non-trusted caller', async () => {
      h.getConfig().auth.trustedCallers = [];
      try {
        await api().get(`/registers/${registerId}/stream-export?with_data=true`).set('Authorization', auth).expect(200);
      } finally {
        h.getConfig().auth.trustedCallers = ['test'];
      }
    });
  });

  describe('POST /registers/import', () => {
    const newReg = (id: number, keys: object[]) => ({ id, name: `imp ${id}`, description: 'imp', meta: {}, keys: { data: keys } });

    it('returns 400 when body is empty', async () => {
      await api().post('/registers/import').set('Authorization', auth).send({}).expect(400);
    });

    it('creates a register only, answering 202', async () => {
      const r = await api()
        .post('/registers/import')
        .set('Authorization', auth)
        .send({ data: newReg(7200, []) })
        .expect(202);
      expect(r.body.data.isAccepted).toBe(true);
    });

    it('rejects an existing register without force', async () => {
      await api()
        .post('/registers/import')
        .set('Authorization', auth)
        .send({ data: newReg(7200, []) })
        .expect(400);
    });

    it('imports keys and records, then updates them with force and clear_records', async () => {
      const rec = (id: string, f: string) => ({ id, data: { f } });
      const data = newReg(7201, [
        keyStruct(72011, { records: { data: [rec('00000000-0000-4000-8000-0000000000a1', 'x'), rec('00000000-0000-4000-8000-0000000000a2', 'y')] } }),
      ]);
      const r = await api().post('/registers/import?rewrite_schema=true&add_data=true').set('Authorization', auth).send({ data }).expect(202);
      expect(r.body.data.changes).toBeDefined();
      const data2 = newReg(7201, [keyStruct(72011, { records: { data: [rec('00000000-0000-4000-8000-0000000000a1', 'z')] } })]);
      const r2 = await api()
        .post('/registers/import?force=true&rewrite_schema=true&add_data=true&clear_records=true')
        .set('Authorization', auth)
        .send({ data: data2 })
        .expect(202);
      expect(JSON.stringify(r2.body.data.changes)).toContain('deleted');
    });

    it('imports key hierarchy where child precedes parent', async () => {
      const data = newReg(7202, [keyStruct(72022, { parentId: 72021 }), keyStruct(72021)]);
      await api().post('/registers/import?rewrite_schema=true').set('Authorization', auth).send({ data }).expect(202);
    });

    it('returns 400 for a cyclic key hierarchy', async () => {
      const data = newReg(7203, [keyStruct(72031, { parentId: 72032 }), keyStruct(72032, { parentId: 72031 })]);
      await api().post('/registers/import?rewrite_schema=true').set('Authorization', auth).send({ data }).expect(400);
    });

    it('returns 400 for a record with a foreign registerId', async () => {
      const data = newReg(7204, [
        keyStruct(72041, { records: { data: [{ id: '00000000-0000-4000-8000-0000000000b1', registerId: 1, data: { f: 'q' } }] } }),
      ]);
      await api().post('/registers/import?add_data=true').set('Authorization', auth).send({ data }).expect(400);
    });

    it('returns 400 for a record with a foreign keyId', async () => {
      const data = newReg(7205, [
        keyStruct(72051, { records: { data: [{ id: '00000000-0000-4000-8000-0000000000c1', keyId: 1, data: { f: 'q' } }] } }),
      ]);
      await api().post('/registers/import?add_data=true').set('Authorization', auth).send({ data }).expect(400);
    });

    it('imports from a file body', async () => {
      const struct = newReg(7206, [keyStruct(72061)]);
      const body = `${JSON.stringify(struct)}\n0-0-${JSON.stringify({ id: '00000000-0000-4000-8000-0000000000d1', data: { f: 'file' } })}\n`;
      const r = await api()
        .post('/registers/import?file=true&rewrite_schema=true&add_data=true')
        .set('Authorization', auth)
        .set('Content-Type', 'text/plain')
        .send(body)
        .expect(200);
      expect(r.text).toContain('"done": true');
    });
  });

  describe('POST /registers/stream-import', () => {
    it('creates the register and keys from the structure chunk', async () => {
      const struct = { id: 7300, name: 'stream', description: 's', meta: {}, keys: { data: [keyStruct(73001, { registerId: 7300 })] } };
      const payload = JSON.stringify(struct);
      const r = await api()
        .post('/registers/stream-import')
        .set('Authorization', auth)
        .set('Content-Type', 'multipart/form-data; boundary=----WebKitFormBoundaryA')
        .send(multipart(payload))
        .expect(200);
      expect(r.body.data.created.registers).toEqual([7300]);
      expect(r.body.data.created.keys).toEqual([73001]);
    });

    it('updates existing entities and clears the rest with clear_records', async () => {
      const struct = { id: 7300, name: 'stream2', description: 's', meta: {}, keys: { data: [keyStruct(73001, { registerId: 7300 })] } };
      const payload = JSON.stringify(struct);
      const r = await api()
        .post('/registers/stream-import?clear_records=true')
        .set('Authorization', auth)
        .set('Content-Type', 'multipart/form-data; boundary=----WebKitFormBoundaryA')
        .send(multipart(payload))
        .expect(200);
      expect(r.body.data.updated.registers).toEqual([7300]);
      expect(r.body.data.updated.keys).toEqual([73001]);
    });
  });
});
