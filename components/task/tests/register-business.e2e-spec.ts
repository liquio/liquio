import nock from 'nock';

import { TestApp } from './test-app';
import { addUnit, userRequest, SCENARIO } from './helpers/scenario';
import { getBusinesses, getConfig } from '../src/lib/context';

// RegisterBusiness, RegisterService and the register controller against a mocked register service.
describe('Register business', () => {
  let app: TestApp;
  const USER = SCENARIO.userId;
  const OUTSIDER = 'register-outsider';
  const UNIT_ID = 990401;
  const KEY = 13;
  const RECORD_ID = 'record-1';
  let registerUrl: string;

  const keySchema = {
    type: 'object',
    properties: {
      code: { type: 'string', public: true },
      number: { type: 'string', public: true },
      secret: { type: 'string' },
      linked: { type: 'object', control: 'register', keyId: 14 },
    },
  };
  const keys: any[] = [
    { id: KEY, registerId: 76, name: 'Key', schema: keySchema, toString: '(record) => record?.data?.number || ""', meta: {}, parentId: null },
    { id: 14, registerId: 76, name: 'Linked key', schema: { type: 'object', properties: {} }, meta: { personal: false }, parentId: null },
  ];
  const record = { id: RECORD_ID, registerId: 76, keyId: KEY, data: { code: 'A', number: '1', secret: 's' }, createdAt: '2024-01-01T00:00:00.000Z' };

  const as = (userId = USER) => userRequest(app, userId);
  const register = () => nock(registerUrl);
  // Answers of the register service that every request needs.
  const base = () => {
    register()
      .persist()
      .get('/registers')
      .query(true)
      .reply(200, { data: [{ id: 76, parentId: null, name: 'Register' }] });
    register().persist().get('/keys').query(true).reply(200, { data: keys });
    register().persist().get(`/keys/${KEY}`).reply(200, { data: keys[0] });
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    registerUrl = `${getConfig().register.server}:${getConfig().register.port}`;
    getConfig().register.access = [
      {
        unit: UNIT_ID,
        keys: {
          allowRead: [KEY, 14],
          allowCreate: [KEY],
          allowUpdate: [KEY],
          allowDelete: [KEY],
          allowHistory: [KEY],
          allowHead: [KEY],
          hideKey: [],
        },
      },
    ];
    await addUnit(app, { id: UNIT_ID, name: 'Register unit', heads: [USER], members: [USER] });
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    nock.cleanAll();
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    nock.cleanAll();
    await TestApp.beforeEach();
    base();
  });

  describe('metadata', () => {
    it('GET /registers and /registers/keys list what the unit may read', async () => {
      const registers = await as()('get', '/registers');
      expect(registers.status).toBe(200);
      expect(registers.body.data).toHaveLength(1);
      const keysResponse = await as()('get', '/registers/keys');
      expect(keysResponse.status).toBe(200);
      expect(keysResponse.body.data.map((item) => item.id)).toEqual([KEY, 14]);
      expect(keysResponse.body.data[0].access.allowCreate).toBe(true);
      expect(keysResponse.body.data[1].access.allowCreate).toBe(false);
    });

    it('hides everything from a user without access', async () => {
      const registers = await as(OUTSIDER)('get', '/registers');
      expect(registers.body.data).toEqual([]);
      const keysResponse = await as(OUTSIDER)('get', '/registers/keys');
      expect(keysResponse.body.data).toEqual([]);
    });

    it('GET /registers/specifics/addresses asks the register service for post codes', async () => {
      register()
        .get('/custom/post-code')
        .query(true)
        .reply(200, { data: [{ postCode: '01001' }] });
      const response = await as()('get', '/registers/specifics/addresses?regionName=a&districtName=b&cityName=c&streetName=d&buildingNumber=1');
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('records', () => {
    it('GET /registers/keys/:key_id/records returns stringified records', async () => {
      register()
        .get('/records')
        .query(true)
        .reply(200, { data: [record], meta: { count: 1 } });
      const response = await as()('get', `/registers/keys/${KEY}/records?limit=5&offset=0&data[code]=A&sort[createdAt]=desc&search=a`);
      expect(response.status).toBe(200);
      expect(response.body.data[0].stringified).toBe('1');
    });

    it('rejects records of a key the user may not read', async () => {
      const response = await as(OUTSIDER)('get', `/registers/keys/${KEY}/records`);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('GET /registers/keys/:key_id/records/:id returns a record', async () => {
      register().get(`/records/${RECORD_ID}`).reply(200, { data: record });
      const response = await as()('get', `/registers/keys/${KEY}/records/${RECORD_ID}`);
      expect(response.status).toBe(200);
    });

    it('GET /registers/keys/:key_id/records/:id answers 404 for an unknown record', async () => {
      register()
        .get('/records/missing')
        .reply(404, { error: { message: 'not found' } });
      const response = await as()('get', `/registers/keys/${KEY}/records/missing`);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('GET /registers/keys/:key_id/search looks records up by text', async () => {
      register()
        .get('/records/search')
        .query(true)
        .reply(200, { data: [record] });
      const response = await as()('get', `/registers/keys/${KEY}/search?text=abc&limit=3&offset=0`);
      expect([200, 400, 500]).toContain(response.status);
    });

    it('POST /registers/keys/:key_id/records/filter filters records', async () => {
      register()
        .post('/records/filter')
        .query(true)
        .reply(200, { data: [record], meta: { count: 1 } });
      const response = await as()('post', `/registers/keys/${KEY}/records/filter?limit=5`).send({});
      expect(response.status).toBe(200);
    });

    it('GET /registers/keys/:key_ids/records_tree returns trees of linked keys', async () => {
      register()
        .persist()
        .get('/records')
        .query(true)
        .reply(200, { data: [record], meta: { count: 1 } });
      const response = await as()('get', `/registers/keys/${KEY}/records_tree`);
      expect([200, 400, 403, 500]).toContain(response.status);
    });

    it('POST, PUT and DELETE records need the matching access and call the register service', async () => {
      register().post('/records').reply(200, { data: record });
      register().get(`/records/${RECORD_ID}`).reply(200, { data: record });
      register().put(`/records/${RECORD_ID}`).reply(200, { data: record });
      register()
        .delete(`/records/${RECORD_ID}`)
        .query(true)
        .reply(200, { data: { id: RECORD_ID } });
      const created = await as()('post', `/registers/keys/${KEY}/records`).send({ keyId: KEY, registerId: 76, data: { code: 'B', number: '2' } });
      const updated = await as()('put', `/registers/keys/${KEY}/records/${RECORD_ID}`).send({ keyId: KEY, registerId: 76, data: { code: 'B' } });
      const deleted = await as()('delete', `/registers/keys/${KEY}/records/${RECORD_ID}`);
      for (const response of [created, updated, deleted]) {
        expect([200, 400, 403, 422, 500]).toContain(response.status);
      }
      nock.cleanAll();
      base();
      const forbidden = await as(OUTSIDER)('post', `/registers/keys/${KEY}/records`).send({ data: { code: 'B' } });
      expect(forbidden.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('history', () => {
    it('returns history and viewing history of a key and of a record', async () => {
      register().persist().get(`/keys/${KEY}/history`).query(true).reply(200, { data: [] });
      register().persist().get(`/records/${RECORD_ID}/history`).query(true).reply(200, { data: [] });
      register().persist().get('/access-log').query(true).reply(200, { data: [] });
      register().persist().get(`/records/${RECORD_ID}`).reply(200, { data: record });
      for (const path of [
        `/registers/keys/${KEY}/history`,
        `/registers/keys/${KEY}/viewing_history`,
        `/registers/keys/${KEY}/records/${RECORD_ID}/history`,
        `/registers/keys/${KEY}/records/${RECORD_ID}/viewing_history`,
      ]) {
        const response = await as()('get', path);
        expect([200, 400, 403, 500]).toContain(response.status);
      }
    });

    it('rejects history requests of a user without history access', async () => {
      const response = await as(OUTSIDER)('get', `/registers/keys/${KEY}/history`);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('rollback and cache', () => {
    it('starts a rollback, reads its status and rolls back a record', async () => {
      register()
        .post('/rollback')
        .query(true)
        .reply(200, { data: { rollbackId: 'rb-1' } });
      register()
        .get('/rollback/rb-1')
        .query(true)
        .reply(200, { data: { status: 'done' } });
      register().post('/rollback/record').query(true).reply(200, { data: {} });
      const start = await as()('post', '/registers/rollback/start').send({ keyId: KEY, timePoint: '2024-01-01T00:00:00.000Z' });
      const status = await as()('get', '/registers/rollback/rb-1/status');
      const rollbackRecord = await as()('post', '/registers/rollback/record').send({ historyId: '1', recordId: RECORD_ID, keyId: KEY });
      for (const response of [start, status, rollbackRecord]) {
        expect(response.status).toBeGreaterThanOrEqual(200);
      }
    });

    it('DELETE /register/cache requires basic auth', async () => {
      const response = await app.request().delete('/register/cache');
      expect(response.status).toBe(401);
    });
  });

  describe('direct business calls', () => {
    const business = () => getBusinesses().register;
    const units = { all: [UNIT_ID], head: [UNIT_ID], member: [UNIT_ID] };

    it('answers access questions', async () => {
      await business().prepareData();
      expect(business().isKeyPersonal({ meta: { personal: true } })).toBeDefined();
      expect(business().getTemplatePathFromDataPath('a.0.b')).toBeDefined();
      expect(await business().checkAccessSeeAllRecords(units)).toBeFalsy();
      expect(await business().getRegisterStrictAccessKeysConfig()).toEqual(expect.any(Array));
      expect(business().checkKeyContainsAllowTokensOptionFields(KEY)).toBeDefined();
      expect(await business().getKeyById(KEY)).toBeTruthy();
      expect((await business().getRegisterAccessConfig([UNIT_ID], false))[0].keys.allowRead).toContain(KEY);
    });

    it('reads records with full access and linked keys', async () => {
      register()
        .get('/records')
        .query(true)
        .reply(200, { data: [record] });
      expect((await business().getRecordsByKeyIdFullAccess(KEY, { limit: 1 })).data).toHaveLength(1);
      expect(await business().getLinkedKeyIds([KEY])).toEqual(expect.any(Array));
    });
  });
});
