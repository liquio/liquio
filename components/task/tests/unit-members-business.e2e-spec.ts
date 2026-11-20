import { getIdApiClient } from '@liquio/back-core';

import { UnitRulesModel } from '../src/models/unit_rules';
import { TestApp } from './test-app';
import { addUnit, userRequest } from './helpers/scenario';
import { getConfig } from '../src/lib/context';

const BASIC_RAW = 'dW5pdHM6dW5pdHM='; // fake "units:units"
const HEAD = 'unit-head';
const MEMBER = 'unit-member';
const OUTSIDER = 'unit-outsider';
const UNIT = 990031;
const BASE_UNIT = 990032;
const OTHER_UNIT = 990033;
const IPN = '2222222222';

// Unit controller driven over HTTP: listing, reading, head views, requested members and member removal.
describe('Unit members', () => {
  let app: TestApp;
  const as = (userId: string) => userRequest(app, userId);
  const idApi = () => getIdApiClient() as any;
  const basic = (method: string, path: string) => app.request()[method](path).set('Authorization', `Basic ${BASIC_RAW}`);
  const unitRow = async (id: number) => (await app.model('unit').findByPk(id)).get({ plain: true });

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    getConfig().basic_auth.tokens.push(BASIC_RAW);
    const common = { heads_ipn: [], members_ipn: [], requested_members: [], based_on: [] };
    await addUnit(app, { id: BASE_UNIT, name: 'Base unit', heads: [], members: [], ...common });
    await addUnit(app, { id: UNIT, name: 'Main unit', heads: [HEAD], members: [HEAD, MEMBER], ...common, based_on: [BASE_UNIT] });
    await addUnit(app, { id: OTHER_UNIT, name: 'Other unit', heads: [], members: [], ...common });
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  describe('reading', () => {
    it('lists only the units of the user', async () => {
      const response = await as(MEMBER)('get', '/units');
      expect(response.status).toBe(200);
      expect(response.body.data.map((v) => v.id)).toContain(UNIT);
      expect(response.body.data.map((v) => v.id)).not.toContain(OTHER_UNIT);
    });

    it('reads a unit by id with basic auth and answers 404 for an unknown one', async () => {
      const found = await basic('get', `/units/${UNIT}`);
      expect(found.status).toBe(200);
      expect(found.body.data.id).toBe(UNIT);
      expect((await basic('get', '/units/123456')).status).toBe(404);
    });

    it('shows the unit with user details to a head only', async () => {
      jest.spyOn(idApi(), 'getUsersByIds').mockResolvedValue([
        { userId: HEAD, firstName: 'Head', lastName: 'One', ipn: IPN },
        { userId: MEMBER, firstName: 'Member', lastName: 'Two' },
      ]);
      const ok = await as(HEAD)('get', `/units/${UNIT}/as-head`);
      expect(ok.status).toBe(200);
      expect(ok.body.data.headsUsers[0].userId).toBe(HEAD);
      expect(ok.body.data.membersUsers).toHaveLength(2);
      expect((await as(MEMBER)('get', `/units/${UNIT}/as-head`)).status).toBe(401);
      jest.spyOn(idApi(), 'getUsersByIds').mockRejectedValueOnce(new Error('id down'));
      expect((await as(HEAD)('get', `/units/${UNIT}/as-head`)).status).toBe(500);
    });

    it('hides head users from members of other units when a super head unit is configured', async () => {
      const config = getConfig();
      config.custom = { ...config.custom, optionalProjectParams: { userRoleUnits: { superHeadUnitId: OTHER_UNIT } } };
      jest.spyOn(idApi(), 'getUsersByIds').mockResolvedValue([{ userId: HEAD }, { userId: MEMBER }]);
      const response = await as(HEAD)('get', `/units/${UNIT}/as-head`);
      expect(response.status).toBe(200);
      expect(response.body.data.headsUsers).toBeUndefined();
      config.custom = { ...config.custom, optionalProjectParams: undefined };
    });

    it('lists participants of a unit for the integration by head id', async () => {
      jest.spyOn(idApi(), 'getUsersByIds').mockResolvedValue([{ userId: HEAD, ipn: IPN }, { userId: MEMBER }]);
      const config = getConfig();
      config.basic_auth.protectedRoutes = [{ route: '/units/participants-as-head', method: 'POST', basicAuthUsers: ['units'] }];
      const ok = await basic('post', '/units/participants-as-head').send({ unitId: UNIT, userId: HEAD });
      expect(ok.status).toBe(200);
      expect(ok.body.data.find((v) => v.userId === HEAD).isHead).toBe(true);
      expect((await basic('post', '/units/participants-as-head').send({ unitId: 123456, userId: HEAD })).status).toBe(404);
      expect((await basic('post', '/units/participants-as-head').send({ unitId: UNIT, userId: MEMBER })).status).toBe(403);
      jest.spyOn(idApi(), 'getUsersByIds').mockRejectedValueOnce(new Error('id down'));
      expect((await basic('post', '/units/participants-as-head').send({ unitId: UNIT, userId: HEAD })).status).toBe(500);
    });
  });

  describe('requested members', () => {
    it('validates the params and the head role', async () => {
      expect((await as(HEAD)('post', `/units/${UNIT}/requested-members`).send({ firstName: 'A' })).status).toBe(400);
      expect((await as(OUTSIDER)('post', `/units/${UNIT}/requested-members`).send({ ipn: IPN, lastName: 'L' })).status).toBe(401);
    });

    it('stores a requested member for an unknown user and rejects the same one twice', async () => {
      jest.spyOn(idApi(), 'getUserByCode').mockResolvedValue(null as any);
      const body = { ipn: IPN, firstName: 'New', middleName: 'Person', lastName: 'Member' };
      const first = await as(HEAD)('post', `/units/${UNIT}/requested-members`).send(body);
      expect(first.status).toBe(200);
      expect((await unitRow(UNIT)).requested_members).toHaveLength(1);
      const second = await as(HEAD)('post', `/units/${UNIT}/requested-members`).send(body);
      expect(second.status).toBe(400);
    });

    it('adds an existing user right away when the names match, including base units', async () => {
      jest
        .spyOn(idApi(), 'getUserByCode')
        .mockResolvedValue({ userId: 'user-new', firstName: 'Alla', middleName: 'B', lastName: 'Kovalenko' } as any);
      const response = await as(HEAD)('post', `/units/${UNIT}/requested-members`).send({
        ipn: '3333333333',
        firstName: 'Alla',
        middleName: 'B',
        lastName: 'Kovalenko',
      });
      expect(response.status).toBe(200);
      expect((await unitRow(UNIT)).members).toContain('user-new');
      expect((await unitRow(BASE_UNIT)).members).toContain('user-new');
      const again = await as(HEAD)('post', `/units/${UNIT}/requested-members`).send({
        ipn: '3333333333',
        firstName: 'Alla',
        middleName: 'B',
        lastName: 'Kovalenko',
      });
      expect(again.status).toBe(400);
    });

    it('rejects a wrong name of an existing user and an exclusive unit rule', async () => {
      jest.spyOn(idApi(), 'getUserByCode').mockResolvedValue({ userId: 'user-other', firstName: 'Real', middleName: 'N', lastName: 'Name' } as any);
      const wrong = await as(HEAD)('post', `/units/${UNIT}/requested-members`).send({
        ipn: '4444444444',
        firstName: 'Fake',
        middleName: 'N',
        lastName: 'Name',
      });
      expect(wrong.status).toBe(400);

      await app.model('unit').update({ members: ['user-other'] }, { where: { id: OTHER_UNIT } });
      const spy = jest.spyOn(UnitRulesModel.prototype, 'getAllByType').mockResolvedValue([[OTHER_UNIT, UNIT]] as any);
      const exclusive = await as(HEAD)('post', `/units/${UNIT}/requested-members`).send({
        ipn: '4444444444',
        firstName: 'Real',
        middleName: 'N',
        lastName: 'Name',
      });
      expect(exclusive.status).toBe(500);
      spy.mockRestore();
      await app.model('unit').update({ members: [] }, { where: { id: OTHER_UNIT } });
    });
  });

  describe('removing members', () => {
    it('validates the params and the head role', async () => {
      expect((await as(HEAD)('delete', `/units/${UNIT}/members`).send({})).status).toBe(400);
      expect((await as(HEAD)('delete', `/units/${UNIT}/members`).send({ userId: 'a', ipn: IPN })).status).toBe(400);
      expect((await as(OUTSIDER)('delete', `/units/${UNIT}/members`).send({ userId: 'a' })).status).toBe(401);
    });

    it('removes a member by user id together with the base unit membership', async () => {
      await app.model('unit').update({ members: [HEAD, 'removable'] }, { where: { id: UNIT } });
      await app.model('unit').update({ members: ['removable'] }, { where: { id: BASE_UNIT } });
      jest.spyOn(idApi(), 'getUsersByIds').mockResolvedValue([{ userId: 'removable', firstName: 'Rem', lastName: 'Ovable' }]);
      const response = await as(HEAD)('delete', `/units/${UNIT}/members`).send({ userId: 'removable' });
      expect(response.status).toBe(200);
      expect((await unitRow(UNIT)).members).not.toContain('removable');
      expect((await unitRow(BASE_UNIT)).members).not.toContain('removable');
      jest.spyOn(idApi(), 'getUsersByIds').mockRejectedValueOnce(new Error('id down'));
      expect((await as(HEAD)('delete', `/units/${UNIT}/members`).send({ userId: 'removable' })).status).toBe(500);
    });

    it('removes a member and a requested member by ipn', async () => {
      await app.model('unit').update({ members_ipn: [IPN] }, { where: { id: UNIT } });
      jest.spyOn(idApi(), 'getUserByCode').mockResolvedValue({ userId: 'by-ipn', firstName: 'Ipn', lastName: 'User' } as any);
      const response = await as(HEAD)('delete', `/units/${UNIT}/members`).send({ ipn: IPN });
      expect(response.status).toBe(200);
      expect((await unitRow(UNIT)).members_ipn).not.toContain(IPN);
      jest.spyOn(idApi(), 'getUserByCode').mockResolvedValue(null as any);
      expect((await as(HEAD)('delete', `/units/${UNIT}/members`).send({ ipn: IPN })).status).toBe(500);
    });
  });
});
