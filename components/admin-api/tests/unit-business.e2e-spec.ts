import { TestApp } from './test-app';
import { prepareFixtures } from './fixtures';
import { asAdmin, grantAllAdminUnits, nockIdUsers } from './fixtures/auth';

const USER_A = 'bbbbbbbbbbbbbbbbbbbbbb01';
const USER_B = 'bbbbbbbbbbbbbbbbbbbbbb02';
const USER_C = 'bbbbbbbbbbbbbbbbbbbbbb03';
const UNIT_MANAGER = 'eeeeeeeeeeeeeeeeeeeeee01';
const UNIT_ADMIN_UNIT = 1000000;

const ID_USERS = [USER_A, USER_B, USER_C, UNIT_MANAGER].map((userId, index) => ({
  userId,
  name: `Tester ${index}`,
  email: `tester${index}@example.com`,
  ipn: `100000000${index}`,
}));

const unitBody = (overrides = {}) => ({
  name: 'Unit',
  description: 'Test unit',
  members: [],
  heads: [],
  data: {},
  menuConfig: {},
  allowTokens: [],
  headsIpn: [],
  membersIpn: [],
  ...overrides,
});

const previous = (unit) => ({
  previousBasedOn: unit.basedOn || [],
  previousMembers: unit.members,
  previousHeads: unit.heads,
  previousAllowTokens: [],
  previousHeadsIpn: unit.headsIpn || [],
  previousMembersIpn: unit.membersIpn || [],
});

describe('Unit business', () => {
  let app: TestApp;

  const createUnit = async (overrides) => {
    nockIdUsers(app, ID_USERS);
    const response = await asAdmin(app, 'post', '/units').send(unitBody(overrides)).expect(200);
    return response.body.data;
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await prepareFixtures(app);
    await grantAllAdminUnits(app);

    // A unit admin that only manages the unit 6001.
    const unitModel = app.model('unit');
    const unitAdmin = await unitModel.findByPk(UNIT_ADMIN_UNIT);
    await unitModel.update({ members: [...unitAdmin.members, UNIT_MANAGER] }, { where: { id: UNIT_ADMIN_UNIT } });
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

  describe('unit admin access', () => {
    beforeAll(async () => {
      await createUnit({ id: 6001, name: 'Managed unit', heads: [UNIT_MANAGER] });
      await createUnit({ id: 6002, name: 'Foreign unit' });
    });

    it('limits the list to the managed units', async () => {
      const response = await asAdmin(app, 'get', '/units', UNIT_MANAGER).expect(200);

      expect(response.body.data.map((unit) => unit.id)).toEqual([6001]);
    });

    it('reads a managed unit and refuses a foreign one', async () => {
      await asAdmin(app, 'get', '/units/6001', UNIT_MANAGER).expect(200);
      await asAdmin(app, 'get', '/units/6002', UNIT_MANAGER).expect(403);
    });

    it('refuses to change a foreign unit', async () => {
      nockIdUsers(app, ID_USERS);
      await asAdmin(app, 'post', '/units/6002/heads', UNIT_MANAGER)
        .send({ heads: [USER_A] })
        .expect(403);
      await asAdmin(app, 'delete', '/units/6002/heads', UNIT_MANAGER)
        .send({ heads: [USER_A] })
        .expect(403);
      await asAdmin(app, 'post', '/units/6002/members', UNIT_MANAGER)
        .send({ members: [USER_A] })
        .expect(403);
      await asAdmin(app, 'delete', '/units/6002/members', UNIT_MANAGER)
        .send({ members: [USER_A] })
        .expect(403);
      await asAdmin(app, 'put', '/units/6002', UNIT_MANAGER)
        .send(unitBody({ id: 6002, ...previous(unitBody()) }))
        .expect(403);
    });
  });

  describe('listing', () => {
    it.each([
      ['/units', true],
      ['/units', false],
      ['/units/all', true],
      ['/units/all', false],
    ])('filters %s by admin_units=%s', async (path, adminUnits) => {
      const response = await asAdmin(app, 'get', path).query({ 'filters[admin_units]': adminUnits }).expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('based-on propagation', () => {
    it('propagates added heads and members to base units on update', async () => {
      await createUnit({ id: 6101, name: 'Base 1' });
      await createUnit({ id: 6102, name: 'Derived', basedOn: [6101], members: [USER_A], heads: [USER_A], membersIpn: ['1'], headsIpn: ['2'] });
      const unit = {
        ...unitBody({ id: 6102, name: 'Derived' }),
        basedOn: [6101],
        members: [USER_A],
        heads: [USER_A],
        membersIpn: ['1'],
        headsIpn: ['2'],
      };

      nockIdUsers(app, ID_USERS);
      await asAdmin(app, 'put', '/units/6102')
        .send({ ...unit, ...previous(unit), members: [USER_B], heads: [USER_B], membersIpn: ['3'], headsIpn: ['4'] })
        .expect(200);

      const base = await asAdmin(app, 'get', '/units/6101').expect(200);
      expect(base.body.data.members).toEqual(expect.arrayContaining([USER_A, USER_B]));
      expect(base.body.data.heads).toEqual(expect.arrayContaining([USER_A, USER_B]));
    });

    it('adds and removes heads and members of a derived unit', async () => {
      await createUnit({ id: 6111, name: 'Base 2' });
      await createUnit({ id: 6112, name: 'Derived 2', basedOn: [6111] });

      nockIdUsers(app, ID_USERS);
      await asAdmin(app, 'post', '/units/6112/heads')
        .send({ heads: [USER_C] })
        .expect(200);
      nockIdUsers(app, ID_USERS);
      await asAdmin(app, 'post', '/units/6112/members')
        .send({ members: [USER_C] })
        .expect(200);

      // Adding the same users again changes nothing.
      nockIdUsers(app, ID_USERS);
      await asAdmin(app, 'post', '/units/6112/heads')
        .send({ heads: [USER_C] })
        .expect(200);
      nockIdUsers(app, ID_USERS);
      await asAdmin(app, 'post', '/units/6112/members')
        .send({ members: [USER_C] })
        .expect(200);

      const base = await asAdmin(app, 'get', '/units/6111').expect(200);
      expect(base.body.data.members).toContain(USER_C);

      nockIdUsers(app, ID_USERS);
      await asAdmin(app, 'delete', '/units/6112/heads')
        .send({ heads: [USER_C] })
        .expect(200);
      nockIdUsers(app, ID_USERS);
      await asAdmin(app, 'delete', '/units/6112/members')
        .send({ members: [USER_C] })
        .expect(200);
    });

    it('answers an error when removing from a missing unit', async () => {
      nockIdUsers(app, ID_USERS);
      const heads = await asAdmin(app, 'delete', '/units/987654/heads').send({ heads: [USER_A] });
      nockIdUsers(app, ID_USERS);
      const members = await asAdmin(app, 'delete', '/units/987654/members').send({ members: [USER_A] });

      expect(heads.status).toBeGreaterThanOrEqual(400);
      expect(members.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('exclusive rules', () => {
    it('refuses members that break an exclusive rule', async () => {
      await createUnit({ id: 6201, name: 'Exclusive 1', members: [USER_A] });
      await createUnit({ id: 6202, name: 'Exclusive 2' });
      await asAdmin(app, 'post', '/unit/rules')
        .send({ type: 'exclusive', ruleSchema: { list: [[6201, 6202]] } })
        .expect(200);

      nockIdUsers(app, ID_USERS);
      const members = await asAdmin(app, 'post', '/units/6202/members').send({ members: [USER_A] });
      nockIdUsers(app, ID_USERS);
      const heads = await asAdmin(app, 'post', '/units/6202/heads').send({ heads: [USER_A] });

      expect(members.status).toBeGreaterThanOrEqual(400);
      expect(heads.status).toBeGreaterThanOrEqual(400);

      await asAdmin(app, 'delete', '/unit/rules').query({ type: 'exclusive' }).expect(200);
    });
  });

  describe('import and delete', () => {
    it('refuses to import an existing unit without force', async () => {
      const unit = await createUnit({ id: 6301, name: 'Importable', members: [USER_A], heads: [USER_B] });
      const exported = await asAdmin(app, 'post', '/units/export')
        .send({ ids: [unit.id] })
        .buffer(true)
        .parse((res, cb) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => cb(null, data));
        })
        .expect(200);

      const response = await asAdmin(app, 'post', '/units/import').set('Content-Type', 'text/plain').send(exported.body);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('deletes a unit with heads and members', async () => {
      await createUnit({ id: 6302, name: 'Disposable', members: [USER_A], heads: [USER_B] });

      nockIdUsers(app, ID_USERS);
      await asAdmin(app, 'delete', '/units/6302').expect(202);
    });
  });
});
