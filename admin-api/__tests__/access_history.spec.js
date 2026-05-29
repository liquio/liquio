const { TestApp } = require('./test-app');
const { prepareFixtures } = require('./fixtures');

const TEST_USER_ID = '61efddaa351d6219eee09043';

// Fixtures: two access history entries with distinct names
const ACCESS_HISTORY_FIXTURES = [
  {
    id: 'aaaaaaaa-0001-11ee-aa00-000000000001',
    user_id: 'user000000000000000000001',
    user_name: 'Alpha User',
    ipn: '10000001',
    operation_type: 'added-to-admin',
    unit_id: null,
    unit_name: null,
    init_user_id: '000000000000000000000001',
    init_user_name: 'Liquio Admin',
    init_ipn: '0000000001',
    init_workflow_id: null,
    init_workflow_name: null,
  },
  {
    id: 'aaaaaaaa-0002-11ee-aa00-000000000002',
    user_id: 'user000000000000000000002',
    user_name: 'Beta Tester',
    ipn: '10000002',
    operation_type: 'deleted-from-admin',
    unit_id: null,
    unit_name: null,
    init_user_id: '000000000000000000000001',
    init_user_name: 'Liquio Admin',
    init_ipn: '0000000001',
    init_workflow_id: null,
    init_workflow_name: null,
  },
];

describe('Access History Controller', () => {
  let app;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await prepareFixtures(app);

    // Ensure the security admin unit (1000001) has our test user as a member so
    // the auth middleware grants access to /access-history.
    await app.model('unit').upsert({
      id: 1000001,
      parent_id: null,
      based_on: [],
      name: 'Security admin',
      description: 'Security admin',
      members: [TEST_USER_ID],
      heads: [],
      data: {},
      menu_config: {},
      allow_tokens: [],
      heads_ipn: [],
      members_ipn: [],
      requested_members: [],
    });

    for (const entry of ACCESS_HISTORY_FIXTURES) {
      await app.model('accessHistory').create(entry);
    }
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

  // Helper: set up auth nock for every request
  function mockAuth(app, payload) {
    app
      .nock('http://id-api:8100')
      .get('/user/info')
      .query({ access_token: payload.authTokens.accessToken })
      .once()
      .reply(200, {
        userId: TEST_USER_ID,
        role: 'admin',
        services: { eds: { data: { pem: 'PEM' } } },
      });
  }

  describe('GET /access-history', () => {
    it('should require authentication', async () => {
      await app.request().get('/access-history').expect(401);
    });

    it('should return all entries with no filter', async () => {
      const { jwt, payload } = app.generateUserToken(TEST_USER_ID);
      mockAuth(app, payload);

      await app
        .request()
        .get('/access-history')
        .set('token', jwt)
        .expect(200)
        .expect((res) => {
          expect(res.body.pagination.total).toBeGreaterThanOrEqual(ACCESS_HISTORY_FIXTURES.length);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should return 0 results for a non-matching search term', async () => {
      const { jwt, payload } = app.generateUserToken(TEST_USER_ID);
      mockAuth(app, payload);

      await app
        .request()
        .get('/access-history')
        .query({ 'filters[search]': 'zzz_no_match_xyz' })
        .set('token', jwt)
        .expect(200)
        .expect((res) => {
          expect(res.body.pagination.total).toBe(0);
          expect(res.body.data).toHaveLength(0);
        });
    });

    it('should return only matching entries for a partial search term', async () => {
      const { jwt, payload } = app.generateUserToken(TEST_USER_ID);
      mockAuth(app, payload);

      // 'Alpha' matches 'Alpha User' but not 'Beta Tester'
      await app
        .request()
        .get('/access-history')
        .query({ 'filters[search]': 'Alpha' })
        .set('token', jwt)
        .expect(200)
        .expect((res) => {
          expect(res.body.pagination.total).toBe(1);
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].userName).toBe('Alpha User');
        });
    });

    it('should match against init_user_name', async () => {
      const { jwt, payload } = app.generateUserToken(TEST_USER_ID);
      mockAuth(app, payload);

      // 'Liquio Admin' is the init_user_name for all fixtures
      await app
        .request()
        .get('/access-history')
        .query({ 'filters[search]': 'Liquio Admin' })
        .set('token', jwt)
        .expect(200)
        .expect((res) => {
          expect(res.body.pagination.total).toBeGreaterThanOrEqual(ACCESS_HISTORY_FIXTURES.length);
        });
    });

    it('should return entries for a case-insensitive partial match', async () => {
      const { jwt, payload } = app.generateUserToken(TEST_USER_ID);
      mockAuth(app, payload);

      // 'beta' (lowercase) should match 'Beta Tester'
      await app
        .request()
        .get('/access-history')
        .query({ 'filters[search]': 'beta' })
        .set('token', jwt)
        .expect(200)
        .expect((res) => {
          expect(res.body.pagination.total).toBe(1);
          expect(res.body.data[0].userName).toBe('Beta Tester');
        });
    });
  });
});
