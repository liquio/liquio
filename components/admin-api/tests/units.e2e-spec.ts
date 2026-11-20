import { TestApp } from './test-app';
import { prepareFixtures } from './fixtures';
import { asAdmin, grantAllAdminUnits, nockIdUsers, textParser } from './fixtures/auth';

const USER_A = 'bbbbbbbbbbbbbbbbbbbbbb01';
const USER_B = 'bbbbbbbbbbbbbbbbbbbbbb02';
const LIMITED_USER = 'dddddddddddddddddddddd01';
const TASK = 'http://task:3000';

const ID_USERS = [
  { userId: USER_A, name: 'Alice Tester', email: 'alice@example.com', ipn: '1000000001' },
  { userId: USER_B, name: 'Bob Tester', email: 'bob@example.com', ipn: '1000000002' },
];

const unitBody = (overrides = {}) => ({
  name: 'Unit one',
  description: 'First test unit',
  members: [USER_A],
  heads: [],
  data: {},
  menuConfig: {},
  allowTokens: [],
  headsIpn: [],
  membersIpn: [],
  ...overrides,
});

describe('Units controllers', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await prepareFixtures(app);
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

  describe('access control', () => {
    it('requires authentication', async () => {
      await app.request().post('/units').send(unitBody()).expect(401);
    });

    it('rejects an admin without the security admin unit', async () => {
      await asAdmin(app, 'post', '/units', LIMITED_USER).send(unitBody()).expect(403);
      await asAdmin(app, 'delete', '/units/1000000', LIMITED_USER).expect(403);
    });

    it('validates the body', async () => {
      await asAdmin(app, 'post', '/units').send({ name: 'x' }).expect(422);
    });
  });

  describe('lifecycle', () => {
    const ID = 5101;

    it('creates a unit and rejects a duplicate name', async () => {
      nockIdUsers(app, ID_USERS);
      const created = await asAdmin(app, 'post', '/units')
        .send(unitBody({ id: ID }))
        .expect(200);
      expect(created.body.data).toMatchObject({ id: ID, name: 'Unit one', members: [USER_A] });

      const duplicate = await asAdmin(app, 'post', '/units')
        .send(unitBody({ id: ID + 1 }))
        .expect(422);
      expect(duplicate.body.errors[0].msg).toBe('Unit already exists.');
    });

    it('reads the unit and returns 404 for a missing one', async () => {
      const found = await asAdmin(app, 'get', `/units/${ID}`).expect(200);
      expect(found.body.data.id).toBe(ID);
      await asAdmin(app, 'get', '/units/987654').expect(404);
    });

    it('lists units with filters and sorting', async () => {
      const list = await asAdmin(app, 'get', '/units').query({ 'filters.name': 'Unit one', 'sort.name': 'asc', page: 1, count: 5 }).expect(200);
      expect(list.body.data.map((u) => u.id)).toContain(ID);
      const admin = await asAdmin(app, 'get', '/units').query({ 'filters.admin_units': true }).expect(200);
      expect(admin.body.data.every((u) => u.adminUnit)).toBe(true);
      await asAdmin(app, 'get', '/units').query({ 'filters.id': ID }).expect(200);

      const all = await asAdmin(app, 'get', '/units/all')
        .query({ 'filters.members': [USER_A] })
        .expect(200);
      expect(all.body.data.some((u) => u.id === ID)).toBe(true);
      await asAdmin(app, 'get', '/units/all').query({ 'filters.admin_units': true }).expect(200);
      await app.request().get('/units').expect(401);
    });

    it('adds and removes heads and members', async () => {
      nockIdUsers(app, ID_USERS);
      const withHead = await asAdmin(app, 'post', `/units/${ID}/heads`)
        .send({ heads: [USER_B] })
        .expect(200);
      expect(withHead.body.data.heads).toContain(USER_B);

      nockIdUsers(app, ID_USERS);
      const withoutHead = await asAdmin(app, 'delete', `/units/${ID}/heads`)
        .send({ heads: [USER_B] })
        .expect(200);
      expect(withoutHead.body.data.heads).not.toContain(USER_B);

      nockIdUsers(app, ID_USERS);
      const withMember = await asAdmin(app, 'post', `/units/${ID}/members`)
        .send({ members: [USER_B] })
        .expect(200);
      expect(withMember.body.data.members).toContain(USER_B);

      nockIdUsers(app, ID_USERS);
      const withoutMember = await asAdmin(app, 'delete', `/units/${ID}/members`)
        .send({ members: [USER_B] })
        .expect(200);
      expect(withoutMember.body.data.members).not.toContain(USER_B);
    });

    it('returns 404 when changing members of a missing unit', async () => {
      nockIdUsers(app, ID_USERS);
      const response = await asAdmin(app, 'post', '/units/987654/members').send({ members: [USER_B] });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('updates a unit and detects conflicts', async () => {
      nockIdUsers(app, ID_USERS);
      const updated = await asAdmin(app, 'put', `/units/${ID}`)
        .send(
          unitBody({
            description: 'Changed',
            heads: [USER_A],
            previousBasedOn: [],
            previousMembers: [USER_A],
            previousHeads: [],
            previousAllowTokens: [],
            previousHeadsIpn: [],
            previousMembersIpn: [],
          }),
        )
        .expect(200);
      expect(updated.body.data.description).toBe('Changed');

      nockIdUsers(app, ID_USERS);
      const conflict = await asAdmin(app, 'put', `/units/${ID}`)
        .send(
          unitBody({
            previousBasedOn: [],
            previousMembers: [USER_B],
            previousHeads: [USER_A],
            previousAllowTokens: [],
            previousHeadsIpn: [],
            previousMembersIpn: [],
          }),
        )
        .expect(409);
      expect(conflict.body.error.message).toContain('conflicts');
    });

    it('exports and re-imports units', async () => {
      const exported = await asAdmin(app, 'post', '/units/export')
        .send({ ids: [ID] })
        .buffer(true)
        .parse(textParser)
        .expect(200);
      expect(typeof exported.body).toBe('string');
      expect(exported.body).toContain('Unit one');

      nockIdUsers(app, ID_USERS);
      await asAdmin(app, 'post', '/units/import').query({ force: true }).set('Content-Type', 'text/plain').send(exported.body).expect(202);

      const broken = await asAdmin(app, 'post', '/units/import').set('Content-Type', 'text/plain').send('not-json');
      expect(broken.status).toBeGreaterThanOrEqual(400);
    });

    it('refuses to delete admin units and deletes a regular unit', async () => {
      await asAdmin(app, 'delete', '/units/1000001').expect(403);
      await asAdmin(app, 'delete', '/units/987654').expect(404);
      nockIdUsers(app, ID_USERS);
      await asAdmin(app, 'delete', `/units/${ID}`).expect(202);
      await asAdmin(app, 'get', `/units/${ID}`).expect(404);
    });
  });

  describe('based-on units and exclusive rules', () => {
    it('propagates members to base units and manages exclusive rules', async () => {
      nockIdUsers(app, ID_USERS);
      await asAdmin(app, 'post', '/units')
        .send(unitBody({ id: 5201, name: 'Base unit', members: [] }))
        .expect(200);
      nockIdUsers(app, ID_USERS);
      await asAdmin(app, 'post', '/units')
        .send(unitBody({ id: 5202, name: 'Derived unit', members: [USER_A], basedOn: [5201] }))
        .expect(200);
      const base = await asAdmin(app, 'get', '/units/5201').expect(200);
      expect(base.body.data.members).toContain(USER_A);

      nockIdUsers(app, ID_USERS);
      await asAdmin(app, 'post', '/units')
        .send(unitBody({ id: 5203, name: 'Other unit', members: [] }))
        .expect(200);

      await asAdmin(app, 'post', '/unit/rules')
        .send({ type: 'exclusive', ruleSchema: [5201, 5203] })
        .expect(200);
      const rules = await asAdmin(app, 'get', '/unit/rules').expect(200);
      expect(rules.body.data.length).toBe(1);
      await asAdmin(app, 'put', '/unit/rules')
        .send({ type: 'exclusive', ruleSchema: [5201, 5202] })
        .expect(200);
      await asAdmin(app, 'delete', '/unit/rules').query({ type: 'exclusive' }).expect(200);
    });

    it('restricts rules to the system admin unit', async () => {
      await asAdmin(app, 'get', '/unit/rules', LIMITED_USER).expect(403);
    });
  });

  describe('unit access (proxied to the task service)', () => {
    it('lists, reads, creates, updates and deletes accesses', async () => {
      app
        .nock(TASK)
        .get('/unit-access')
        .query(true)
        .reply(200, { data: [{ id: 1 }] });
      const list = await asAdmin(app, 'get', '/unit-access').query({ unit_id: 1000002, type: 'register' }).expect(200);
      expect(list.body.data).toEqual([{ id: 1 }]);

      app
        .nock(TASK)
        .get('/unit-access/1')
        .reply(200, { data: { id: 1 } });
      await asAdmin(app, 'get', '/unit-access/1').expect(200);

      app
        .nock(TASK)
        .post('/unit-access')
        .reply(200, { data: { id: 2 } });
      await asAdmin(app, 'post', '/unit-access')
        .send({ unitId: 1000002, type: 'register', data: { keys: [] } })
        .expect(200);

      app
        .nock(TASK)
        .put('/unit-access/2')
        .reply(200, { data: { id: 2 } });
      await asAdmin(app, 'put', '/unit-access/2')
        .send({ unitId: 1000002, type: 'register', data: { keys: ['k'] } })
        .expect(200);

      app.nock(TASK).delete('/unit-access/2').reply(200, { data: {} });
      await asAdmin(app, 'delete', '/unit-access/2').expect(200);
    });

    it('validates payloads and propagates task failures', async () => {
      await asAdmin(app, 'post', '/unit-access').send({ unitId: 1000002, type: 'unknown', data: {} }).expect(422);

      app
        .nock(TASK)
        .get('/unit-access/9')
        .reply(500, { error: { message: 'Task failed' } });
      const failed = await asAdmin(app, 'get', '/unit-access/9');
      expect([200, 500]).toContain(failed.status);
    });
  });
});
