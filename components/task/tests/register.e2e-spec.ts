import { TestApp } from './test-app';

import { prepareFixtures } from './fixtures';
import { expectAuthRequired } from './helpers/auth_guard';

describe('Register Controller', () => {
  let app: TestApp;

  const TEST_USER_ID = '61efddaa351d6219eee09043';
  const TEST_TEMPLATE_ID = 990001;
  const TEST_DOCUMENT_ID = '7f4f0000-0000-4000-8000-000000000001';

  const registerSchemaTemplate = {
    title: 'Register Controller Test Template',
    type: 'object',
    properties: {
      step: {
        type: 'object',
        properties: {
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                register: {
                  type: 'object',
                  control: 'register',
                  keyId: 13,
                  setDefined: false,
                  filters: [
                    {
                      name: 'code',
                      value: 'data.step.rows.X.lookup.X.code',
                    },
                  ],
                },
              },
            },
          },
          registerSearch: {
            type: 'object',
            control: 'register',
            keyId: 13,
            setDefined: false,
            filters: [
              {
                name: 'number',
                value: '1',
              },
            ],
            searchEqual: "() => '1';",
          },
        },
      },
    },
  };

  const registerBaseResponse = {
    data: [
      {
        id: 13,
        registerId: 76,
        schema: {
          type: 'object',
          properties: {
            code: { type: 'string', public: true },
            number: { type: 'string', public: true },
          },
        },
        toString: '(record) => record?.data?.number || "";',
        meta: {},
      },
    ],
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();

    await prepareFixtures(app);

    await app.model('documentTemplate').create({
      id: TEST_TEMPLATE_ID,
      name: 'Register Controller Test',
      json_schema: JSON.stringify(registerSchemaTemplate),
      html_template: '<html><body>test</body></html>',
      access_json_schema: {},
      additional_data_to_sign: null,
    });

    await app.model('document').create({
      id: TEST_DOCUMENT_ID,
      parent_id: null,
      document_template_id: TEST_TEMPLATE_ID,
      document_state_id: 1,
      cancellation_type_id: null,
      number: null,
      is_final: false,
      owner_id: TEST_USER_ID,
      created_by: TEST_USER_ID,
      updated_by: TEST_USER_ID,
      data: {
        step: {
          rows: [{ lookup: [{ code: 'A0' }, { code: 'A1' }] }, { lookup: [{ code: 'B0' }, { code: 'B1' }] }],
        },
      },
      description: null,
      file_id: null,
      file_name: null,
      file_type: null,
      asic: { asicmanifestFileId: null, filesIds: [] },
      external_id: null,
      file_size: null,
    });

    await app.model('userInbox').create({
      user_id: TEST_USER_ID,
      document_id: TEST_DOCUMENT_ID,
      name: 'Register Controller Test',
      number: null,
      is_read: false,
      meta: {},
    });
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

  const mockUserAuth = (payload) => {
    app.nockId.get('/user/info').query({ access_token: payload.authTokens.accessToken }).once().reply(200, {
      userId: TEST_USER_ID,
      role: 'individual',
      services: {},
    });
  };

  const mockRegisterMetadata = () => {
    const registerBaseUrl = `${global.config.register.server}:${global.config.register.port}`;

    app
      .nock(registerBaseUrl)
      .get('/registers')
      .query(true)
      .once()
      .reply(200, { data: [{ id: 76, parentId: null }] });

    app.nock(registerBaseUrl).get('/keys').query(true).once().reply(200, registerBaseResponse);
  };

  it('applies positional .X. placeholders for nested control paths in low-code filters', async () => {
    const { jwt, payload } = app.generateUserToken(TEST_USER_ID);

    mockUserAuth(payload);
    mockRegisterMetadata();

    const registerBaseUrl = `${global.config.register.server}:${global.config.register.port}`;

    app
      .nock(registerBaseUrl)
      .post('/records/filter')
      .query((query) => {
        return query.key_id === '13' && query['data[code]'] === 'B1' && !query.search_equal;
      })
      .once()
      .reply(200, {
        data: [
          {
            id: 'record-1',
            registerId: 76,
            keyId: 13,
            data: { code: 'B1', number: '42' },
          },
        ],
        meta: { count: 1, limit: 10, offset: 0 },
      });

    await app
      .request()
      .post(`/registers/keys/13/records/filter?control=documents.${TEST_DOCUMENT_ID}.step.rows.1.register`)
      .set('token', jwt)
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(1);
      });
  });

  it('preserves existing behavior: drops data filters when searchEqual is defined in low-code control', async () => {
    const { jwt, payload } = app.generateUserToken(TEST_USER_ID);

    mockUserAuth(payload);
    mockRegisterMetadata();

    const registerBaseUrl = `${global.config.register.server}:${global.config.register.port}`;

    app
      .nock(registerBaseUrl)
      .post('/records/filter')
      .query((query) => {
        return query.key_id === '13' && query.search_equal === '1' && typeof query['data[number]'] === 'undefined';
      })
      .once()
      .reply(200, {
        data: [],
        meta: { count: 0, limit: 10, offset: 0 },
      });

    await app
      .request()
      .post(`/registers/keys/13/records/filter?control=documents.${TEST_DOCUMENT_ID}.step.registerSearch`)
      .set('token', jwt)
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(0);
      });
  });

  describe('GET /registers', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/registers');
    });
  });

  describe('GET /registers/specifics/addresses', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/registers/specifics/addresses');
    });
  });

  describe('GET /registers/keys', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/registers/keys');
    });
  });

  describe('GET /registers/keys/:key_id/search', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/registers/keys/:key_id/search');
    });
  });

  describe('GET /registers/keys/:key_id/records', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/registers/keys/:key_id/records');
    });
  });

  describe('GET /registers/keys/:key_id/history', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/registers/keys/:key_id/history');
    });
  });

  describe('GET /registers/keys/:key_id/viewing_history', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/registers/keys/:key_id/viewing_history');
    });
  });

  describe('POST /registers/keys/:key_id/records/filter', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/registers/keys/:key_id/records/filter');
    });
  });

  describe('GET /registers/keys/:key_ids/records_tree', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/registers/keys/:key_ids/records_tree');
    });
  });

  describe('GET /registers/keys/:key_id/records/:id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/registers/keys/:key_id/records/:id');
    });
  });

  describe('GET /registers/keys/:key_id/records/:record_id/history', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/registers/keys/:key_id/records/:record_id/history');
    });
  });

  describe('GET /registers/keys/:key_id/records/:record_id/viewing_history', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/registers/keys/:key_id/records/:record_id/viewing_history');
    });
  });

  describe('POST /registers/keys/:key_id/records', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/registers/keys/:key_id/records');
    });
  });

  describe('PUT /registers/keys/:key_id/records/:id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'put', '/registers/keys/:key_id/records/:id');
    });
  });

  describe('DELETE /registers/keys/:key_id/records/:id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'delete', '/registers/keys/:key_id/records/:id');
    });
  });

  describe('POST /registers/rollback/start', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/registers/rollback/start');
    });
  });

  describe('GET /registers/rollback/:rollbackId/status', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/registers/rollback/:rollbackId/status');
    });
  });

  describe('POST /registers/rollback/record', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/registers/rollback/record');
    });
  });

  describe('DELETE /register/cache', () => {
    it('requires basic auth credentials', async () => {
      await app.request().delete('/register/cache').expect(401);
    });
  });
});
