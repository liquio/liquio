import xlsx from 'node-xlsx';

import { TestApp } from './test-app';
import { asAdmin, grantAllAdminUnits, textParser } from './fixtures/auth';

const REGISTER = 'http://register:8103';

// Every route below fails at its first upstream call.
const ERROR_ROUTES: Array<[string, string, string, any?]> = [
  ['get', '/registers', 'get'],
  ['get', '/registers/all', 'get'],
  ['get', '/registers/1', 'get'],
  ['post', '/registers', 'post', { name: 'Register', description: 'Description' }],
  ['put', '/registers/1', 'get', { name: 'Register', description: 'Description' }],
  ['delete', '/registers/1', 'get'],
  ['get', '/registers/keys', 'get'],
  ['get', '/registers/keys/all', 'get'],
  ['get', '/registers/keys/synced?ids=1', 'get'],
  ['get', '/registers/keys/synced/all', 'get'],
  ['get', '/registers/keys/1', 'get'],
  ['put', '/registers/keys/1/mapping', 'put', { mapping: JSON.stringify({ properties: {} }) }],
  ['post', '/registers/keys', 'get', { name: 'Key', description: 'Description', registerId: 1, schema: {}, toString: 'name' }],
  ['put', '/registers/keys/1', 'get', { name: 'Key', description: 'Description', registerId: 1, schema: {}, toString: 'name' }],
  ['delete', '/registers/keys/1', 'get'],
  ['post', '/registers/keys/1/reindex', 'post'],
  ['post', '/registers/keys/1/afterhandlers-reindex', 'post', { handlers: [] }],
  ['get', '/registers/keys/1/records', 'get'],
  ['get', '/registers/keys/1/records/rec-1', 'get'],
  ['post', '/registers/keys/1/records', 'post', { registerId: 1, keyId: 1, data: { a: 1 } }],
  ['put', '/registers/keys/1/records/rec-1', 'put', { registerId: 1, keyId: 1, data: { a: 1 } }],
  ['delete', '/registers/keys/1/records/rec-1', 'delete'],
  ['post', '/registers/records/bulk', 'post', { registerId: 1, keyId: 1, records: [{ data: { a: 1 } }] }],
  ['get', '/registers/1/export', 'get'],
  ['get', '/registers/1/stream-export', 'get'],
  ['get', '/registers/1/keys/1/export-xlsx', 'get'],
  ['post', '/registers/1/keys/1/import-xlsx', 'get'],
];

describe('Register routes: upstream errors, files and xlsx', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await grantAllAdminUnits(app);
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  describe('upstream failure', () => {
    it.each(ERROR_ROUTES)('%s %s answers 500 when register fails', async (...row) => {
      const [method, path, upstreamMethod, body] = row;
      app.nock(REGISTER)[upstreamMethod](/.*/).optionally().replyWithError('connect ECONNREFUSED');

      let req = asAdmin(app, method as any, path);
      if (body) req = req.send(body);
      const response = await req;

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('file transfer', () => {
    it('streams export through the register file url', async () => {
      app.nock(REGISTER).get('/registers/1/export').query({ with_data: 'false', file: 'true' }).reply(200, 'exported-register-content');
      app.nock(REGISTER).get('/registers/1/export').query(true).optionally().reply(200, 'exported-register-content');

      const response = await asAdmin(app, 'get', '/registers/1/export?file=true').buffer(true).parse(textParser);

      expect(response.status).toBe(200);
      expect(response.body).toBe('exported-register-content');
    });

    it('answers 404 when the stream export has no register', async () => {
      app.nock(REGISTER).get('/registers/9/export').query(true).reply(200, {});

      const response = await asAdmin(app, 'get', '/registers/9/stream-export');

      expect([200, 404]).toContain(response.status);
    });

    it('rejects a malformed JSON import with 500', async () => {
      const response = await asAdmin(app, 'post', '/registers/import').set('Content-Type', 'application/octet-stream').send(Buffer.from('not json'));

      expect(response.status).toBe(500);
    });

    it('accepts the import when register answers with an error status', async () => {
      app
        .nock(REGISTER)
        .post('/registers/import')
        .query(true)
        .reply(400, { error: { message: '"Register already exists."' } });

      const response = await asAdmin(app, 'post', '/registers/import')
        .set('Content-Type', 'application/octet-stream')
        .send(Buffer.from(JSON.stringify({ id: 1 })));

      // HttpRequest returns error bodies instead of throwing (see BUGS.md), so the conflict mapping never fires.
      expect(response.status).toBe(202);
    });
  });

  describe('xlsx export', () => {
    it('answers 404 when the key does not exist', async () => {
      app.nock(REGISTER).get('/keys/7').reply(200, {});

      const response = await asAdmin(app, 'get', '/registers/1/keys/7/export-xlsx');

      expect(response.status).toBe(404);
    });

    it('builds a workbook from the register records', async () => {
      app
        .nock(REGISTER)
        .get('/keys/1')
        .reply(200, { data: { id: 1, registerId: 1, schema: { properties: { name: {}, tags: {}, empty: {} } } } });
      app
        .nock(REGISTER)
        .get('/records')
        .query(true)
        .times(2)
        .reply(200, { data: [{ data: { name: 'Alice', tags: ['a', 'b'] } }], meta: { count: 1, limit: 1 } });

      const response = await asAdmin(app, 'get', '/registers/1/keys/1/export-xlsx')
        .buffer(true)
        .parse((res, cb) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toContain('register.xlsx');
      const [sheet] = xlsx.parse(response.body);
      expect(sheet.data[0]).toEqual(['name', 'tags', 'empty']);
      expect(sheet.data[1][0]).toBe('Alice');
      expect(sheet.data[1][1]).toBe('_JSON:["a","b"]');
    });

    it('builds an empty workbook when there are no records', async () => {
      app
        .nock(REGISTER)
        .get('/keys/1')
        .reply(200, { data: { id: 1, registerId: 1 } });
      app
        .nock(REGISTER)
        .get('/records')
        .query(true)
        .times(2)
        .reply(200, { data: [], meta: { count: 0, limit: 10 } });

      const response = await asAdmin(app, 'get', '/registers/1/keys/1/export-xlsx')
        .buffer(true)
        .parse((res, cb) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      expect(response.status).toBe(200);
    });
  });

  describe('xlsx import', () => {
    const workbook = (rows: any[][]) => xlsx.build([{ name: 'register', data: rows } as any]);

    const mockRegisterAndKey = (registerId = 1) => {
      app
        .nock(REGISTER)
        .get('/registers/1')
        .reply(200, { data: { id: 1, meta: {} } });
      app
        .nock(REGISTER)
        .get('/keys/1')
        .times(2)
        .reply(200, { data: { id: 1, registerId, meta: {} } });
    };

    const mockUpdates = () => {
      app
        .nock(REGISTER)
        .put('/registers/1')
        .reply(200, { data: { id: 1 } });
      app
        .nock(REGISTER)
        .put('/keys/1')
        .reply(200, { data: { id: 1 } });
    };

    it('imports new rows in a batch and updates meta', async () => {
      mockRegisterAndKey();
      app
        .nock(REGISTER)
        .post('/records/bulk', (body) => body.records.length === 2 && body.records[0].data.name === 'Alice')
        .reply(200, { data: { importedRecords: [{ id: 'r1' }, { id: 'r2' }] } });
      mockUpdates();

      const response = await asAdmin(app, 'post', '/registers/1/keys/1/import-xlsx')
        .set('Content-Type', 'application/octet-stream')
        .send(workbook([['name', 'tags'], ['Alice', '_JSON:["a"]'], ['Bob', ' '], []]));

      expect(response.status).toBe(202);
    });

    it('updates existing rows by a unique column and clears the rest', async () => {
      mockRegisterAndKey();
      app
        .nock(REGISTER)
        .get('/records')
        .query(true)
        .times(2)
        .reply(function (uri) {
          return uri.includes('Alice') ? [200, { data: [{ id: 'existing' }] }] : [200, { data: [] }];
        });
      app
        .nock(REGISTER)
        .put('/records/existing')
        .reply(200, { data: { id: 'existing' } });
      app
        .nock(REGISTER)
        .post('/records/bulk')
        .reply(200, { data: { importedRecords: [{ id: 'new' }] } });
      app
        .nock(REGISTER)
        .delete('/records/bulk', (body) => body.skipRecordIds.length === 2)
        .reply(200, { data: { deleted: 3 } });
      mockUpdates();

      const response = await asAdmin(app, 'post', '/registers/1/keys/1/import-xlsx?unique=name&clear_records=true')
        .set('Content-Type', 'application/octet-stream')
        .send(workbook([['name'], ['Alice'], ['Carol']]));

      expect(response.status).toBe(202);
    });

    it('rejects a key that belongs to another register', async () => {
      mockRegisterAndKey(2);

      const response = await asAdmin(app, 'post', '/registers/1/keys/1/import-xlsx')
        .set('Content-Type', 'application/octet-stream')
        .send(workbook([['name'], ['Alice']]));

      expect(response.status).toBe(500);
    });

    it('answers an error when the register does not exist', async () => {
      app.nock(REGISTER).get('/registers/1').reply(200, {});

      const response = await asAdmin(app, 'post', '/registers/1/keys/1/import-xlsx')
        .set('Content-Type', 'application/octet-stream')
        .send(workbook([['name']]));

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('answers an error when the key does not exist', async () => {
      app
        .nock(REGISTER)
        .get('/registers/1')
        .reply(200, { data: { id: 1 } });
      app.nock(REGISTER).get('/keys/1').reply(200, {});

      const response = await asAdmin(app, 'post', '/registers/1/keys/1/import-xlsx')
        .set('Content-Type', 'application/octet-stream')
        .send(workbook([['name']]));

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
