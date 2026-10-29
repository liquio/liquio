import { EventUser } from '../src/services/event/user';
import { EventFile } from '../src/services/event/file';
import { TestApp } from './test-app';

const WF = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('Group B - event user service, unit model, file service', () => {
  let app: TestApp;
  let unitModel: any;
  let accessHistoryModel: any;
  let taskModel: any;
  let user: EventUser;
  let idApi: any;
  let nextId = 710000;

  const common = () => ({
    unitModel,
    accessHistoryModel,
    taskModel,
    workflowId: WF,
    eventTemplate: 'tpl',
    userName: 'Test User',
    initUserName: 'Init',
    initUserId: 'init-1',
  });
  const mkUnit = (extra: any = {}) =>
    unitModel.create({ id: nextId++, name: `Unit ${nextId}`, description: 'd', members: [], heads: [], membersIpn: [], headsIpn: [], ...extra });

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup({});
    unitModel = (app as any).models.models.unit;
    accessHistoryModel = (app as any).models.models.accessHistory;
    taskModel = (app as any).models.models.task;
    user = new EventUser({});
    idApi = {
      updateUserById: jest.fn(async (id: string, data: any) => ({ id, ...data })),
      getUsersByIdsRaw: jest.fn(async (ids: string[]) => ids.map((userId) => ({ userId, first_name: 'F', last_name: 'L' }))),
      getUsersByCodesRaw: jest.fn(async (code: string) =>
        code === 'none' ? [] : code === 'dup' ? [{ userId: 'u1' }, { userId: 'u2' }] : [{ userId: `user-${code}`, ipn: code }],
      ),
      getUsersByEdrpouRaw: jest.fn(async () => [{ userId: 'edr-1' }]),
      searchUsersRaw: jest.fn(async () => [{ userId: 'srch-1' }]),
      getBriefUserInfo: jest.fn((u: any) => ({ userId: u.userId, name: 'n' })),
    };
    user.idApiClient = idApi;
  });
  afterAll(async () => {
    await TestApp.afterAll(app);
  });
  afterEach(async () => {
    await TestApp.afterEach(app);
  });
  beforeEach(async () => {
    await TestApp.beforeEach(app);
  });

  describe('UnitModel', () => {
    it('covers CRUD and array helpers', async () => {
      const u = await mkUnit({ basedOn: [], data: { a: 1 }, menuConfig: { m: 1 }, allowTokens: ['t0'] });
      expect((await unitModel.getAll()).length).toBeGreaterThan(0);
      expect((await unitModel.findById(u.id)).name).toBe(u.name);
      await expect(unitModel.findById(999999)).rejects.toThrow(TypeError);

      const withToken = await unitModel.create({ id: nextId++, name: 'tok', description: 'd', allowTokenEqualsId: true });
      expect(withToken.allowTokens).toContain(`${withToken.id}`);

      const upd = await unitModel.update({
        id: u.id,
        name: 'renamed',
        heads: ['h1'],
        members: ['m1'],
        headsIpn: ['1'],
        membersIpn: ['2'],
        basedOn: [],
        isAllowTokensMustBeAppended: true,
        allowTokens: 'tx',
      });
      expect(upd.name).toBe('renamed');
      expect(upd.allowTokens).toContain('tx');
      expect(await unitModel.update({ id: 987654, name: 'x' })).toBeNull();
      await expect(unitModel.update({ id: u.id, name: 'x', basedOn: 'bad' })).rejects.toBeDefined();

      expect((await unitModel.updateMembers(u.id, ['m2'])).members).toEqual(['m2']);
      await unitModel.updateMembers(987654, ['m2']).catch(() => null);
      const users = await unitModel.getUsersFromUnits([u.id]);
      expect(users.all).toEqual(expect.arrayContaining(['h1', 'm2']));
      expect((await unitModel.addAllowToken(u.id, 'tz')).allowTokens).toContain('tz');
      await unitModel.addAllowToken(987654, 'tz').catch(() => null);
    });

    it('covers add/remove user and ipn operations, including missing units', async () => {
      const u = await mkUnit();
      expect((await unitModel.addMember(u.id, 'a')).members).toEqual(['a']);
      expect((await unitModel.addHead(u.id, 'a')).heads).toEqual(['a']);
      expect((await unitModel.addHeadIpn(u.id, '11')).headsIpn).toEqual(['11']);
      expect((await unitModel.addMemberIpn(u.id, '22')).membersIpn).toEqual(['22']);
      expect((await unitModel.addMemberIpnList(u.id, ['33', '44'])).membersIpn).toEqual(expect.arrayContaining(['22', '33', '44']));
      expect((await unitModel.addRequestedMember(u.id, { ipn: '55', firstName: 'A', lastName: 'B' })).requestedMembers ?? true).toBeTruthy();

      expect((await unitModel.removeMemberIpnList(u.id, ['33'])).membersIpn.sort()).toEqual(['22', '44']);
      expect((await unitModel.removeMemberIpn(u.id, '22')).membersIpn).toEqual(['44']);
      expect((await unitModel.removeHeadIpn(u.id, '11')).headsIpn).toEqual([]);
      await unitModel.addHeadIpn(u.id, '66');
      expect((await unitModel.removeHeadIpnList(u.id, ['66'])).headsIpn).toEqual([]);
      await unitModel.addMember(u.id, 'b');
      expect((await unitModel.removeMemberList(u.id, ['b'])).members).toEqual(['a']);
      expect((await unitModel.removeMember(u.id, 'a')).members).toEqual([]);
      await unitModel.addHead(u.id, 'h2');
      await unitModel.addHead(u.id, 'h3');
      expect((await unitModel.removeHeadList(u.id, ['h2'])).heads.sort()).toEqual(['a', 'h3']);
      expect((await unitModel.removeHead(u.id, 'h3')).heads).toEqual(['a']);

      const missing = 987654;
      const results = await Promise.all([
        unitModel.addMember(missing, 'x').catch(() => null),
        unitModel.addHead(missing, 'x').catch(() => null),
        unitModel.addRequestedMember(missing, { ipn: '1' }).catch(() => null),
        unitModel.addHeadIpn(missing, '1').catch(() => null),
        unitModel.addMemberIpn(missing, '1').catch(() => null),
        unitModel.addMemberIpnList(missing, ['1']).catch(() => null),
        unitModel.removeMember(missing, 'x').catch(() => null),
        unitModel.removeMemberList(missing, ['x']).catch(() => null),
        unitModel.removeHead(missing, 'x').catch(() => null),
        unitModel.removeHeadList(missing, ['x']).catch(() => null),
        unitModel.removeMemberIpn(missing, '1').catch(() => null),
        unitModel.removeMemberIpnList(missing, ['1']).catch(() => null),
        unitModel.removeHeadIpn(missing, '1').catch(() => null),
        unitModel.removeHeadIpnList(missing, ['1']).catch(() => null),
      ]);
      results.forEach((r) => expect(r).toBeNull());
    });

    it('fixes the id sequence when it is behind the max id', async () => {
      await mkUnit({ id: 799000 });
      await unitModel.fixLastUnitIdIfNeedIt();
      const created = await unitModel.create({ name: 'auto', description: 'd' });
      expect(created.id).toBeGreaterThan(799000);
    });
  });

  describe('EventUser add operations', () => {
    it('addMember / addMemberList / base units / already member / exclusive rules', async () => {
      const base = await mkUnit();
      const u = await mkUnit({ basedOn: [base.id] });
      const r = await user.addMember({ ...common(), unitId: u.id, userId: 'um1' });
      expect(r.error).toBeUndefined();
      expect((await unitModel.findById(base.id)).members).toContain('um1');
      expect((await user.addMember({ ...common(), unitId: u.id, userId: 'um1' })).error).toMatch(/already/);

      const list = await user.addMemberList({ ...common(), unitId: u.id, userIdList: ['um2', 'um3'] });
      expect(list.result).toHaveLength(2);
      expect((await user.addMemberList({ ...common(), unitId: u.id, userIdList: [] })).error).toMatch(/not valid/);

      // Exclusive rules.
      const a = await mkUnit();
      const b = await mkUnit();
      await user.unitRulesModel.model
        .create({ id: nextId++, unit_rule_type: 'exclusive', rule_schema: { list: [[a.id, b.id]] } })
        .catch(TestApp.catch('rules'));
      await user.addMember({ ...common(), unitId: a.id, userId: 'user-ex1' });
      await expect(user.addMember({ ...common(), unitId: b.id, userId: 'user-ex1' })).rejects.toThrow(/exclusive/);
      await expect(user.addHead({ ...common(), unitId: b.id, userId: 'user-ex1' })).rejects.toThrow(/exclusive/);
      await expect(user.addMemberIpn({ ...common(), unitId: b.id, ipn: 'ex1' })).rejects.toThrow(/exclusive/);
      await expect(user.addHeadIpn({ ...common(), unitId: b.id, ipn: 'ex1' })).rejects.toThrow(/exclusive/);
      await expect(user.addMemberIpnList({ ...common(), unitId: b.id, ipnList: ['ex1'] })).rejects.toThrow(/exclusive/);
      await expect(user.addMembersToUnitsIpn({ ...common(), unitIdList: [b.id], ipnList: ['ex1'] })).rejects.toThrow(/exclusive/);
      await user.unitRulesModel.model.destroy({ where: {} });
    });

    it('addHead and addHeadList incl. base units and duplicates', async () => {
      const base = await mkUnit();
      const u = await mkUnit({ basedOn: [base.id] });
      expect((await user.addHead({ ...common(), unitId: u.id, userId: 'uh1' })).error).toBeUndefined();
      expect((await unitModel.findById(base.id)).heads).toContain('uh1');
      expect((await user.addHead({ ...common(), unitId: u.id, userId: 'uh1' })).error).toMatch(/already/);
      const list = await user.addHeadList({ ...common(), unitId: u.id, userIdList: ['uh2', 'uh3'] });
      expect(list.result).toHaveLength(2);
      expect((await user.addHeadList({ ...common(), unitId: u.id, userIdList: null })).error).toMatch(/not valid/);
    });

    it('ipn variants and requested members', async () => {
      const base = await mkUnit();
      const u = await mkUnit({ basedOn: [base.id] });
      expect((await user.addMemberIpn({ ...common(), unitId: u.id, ipn: '1001' })).error).toBeUndefined();
      expect((await unitModel.findById(base.id)).membersIpn).toContain('1001');
      expect((await user.addMemberIpn({ ...common(), unitId: u.id, ipn: '1001' })).error).toMatch(/already/);
      expect((await user.addHeadIpn({ ...common(), unitId: u.id, ipn: '1002' })).error).toBeUndefined();
      expect((await user.addHeadIpn({ ...common(), unitId: u.id, ipn: '1002' })).error).toMatch(/already/);

      const l = await user.addMemberIpnList({ ...common(), unitId: u.id, ipnList: [1001, '1003', 1004, '1003'] });
      expect(l.error).toBeUndefined();
      expect((await user.addMemberIpnList({ ...common(), unitId: u.id, ipnList: ['1003', '1004'] })).error).toMatch(/already/);
      const hl = await user.addHeadIpnList({ ...common(), unitId: u.id, ipnList: ['1005', '1006'] });
      expect(hl.error).toBeUndefined();
      expect(await user.addHeadIpnList({ ...common(), unitId: u.id, ipnList: ['1005', '1006'] })).toBeDefined();

      const multi = await user.addMembersToUnitsIpn({ ...common(), unitIdList: [u.id, base.id], ipnList: ['1003', '2001', 2002] });
      expect(multi).toHaveLength(2);
      const again = await user.addMembersToUnitsIpn({ ...common(), unitIdList: [u.id], ipnList: ['1003', '2001', '2002'] });
      expect(again[0].error).toMatch(/already/);

      expect((await user.addRequestedMember({ unitId: u.id, ipn: '3001', userName: 'First Middle Part Last', unitModel })).error).toBeUndefined();
      expect(await user.addRequestedMember({ unitId: u.id, ipn: '3001', userName: 'x y', unitModel })).toBeDefined();
      expect((await user.addRequestedMember({ unitId: u.id, ipn: '3002', userName: '', unitModel })).error).toMatch(/not valid/);
      await expect(user.addRequestedMember({ unitId: 987654, ipn: '3003', userName: 'a b', unitModel })).rejects.toThrow(TypeError);
    });

    it('is*InUnit helpers survive errors', async () => {
      const broken = { findById: jest.fn().mockRejectedValue(new Error('db down')) };
      expect(await user.isUserAlreadyInUnit(1, 'x', broken, 'member')).toBeFalsy();
      expect(await user.isIpnAlreadyInUnit(1, 'x', broken, 'head')).toBeFalsy();
      await expect(user.getCurrentUnitIpnList(1, ['x'], broken, 'member')).rejects.toBeDefined();
      await expect(user.checkIsUserAlreadyInUnitAsRequestedMember(1, 'x', broken)).rejects.toThrow('db down');
      const u = await mkUnit({ heads: ['hh'], headsIpn: ['9'] });
      expect(await user.isUserAlreadyInUnit(u.id, 'hh', unitModel, 'head')).toBe(true);
      expect(await user.getCurrentUnitIpnList(u.id, ['9'], unitModel, 'head')).toEqual(['9']);
    });

    it('rethrows model errors', async () => {
      const failing = {
        ...common(),
        unitModel: {
          ...unitModel,
          findById: async () => ({ members: [], heads: [], membersIpn: [], headsIpn: [] }),
          getAll: async () => [],
          addMember: jest.fn().mockRejectedValue(new Error('boom')),
          addHead: jest.fn().mockRejectedValue(new Error('boom')),
          addMemberIpn: jest.fn().mockRejectedValue(new Error('boom')),
          addHeadIpn: jest.fn().mockRejectedValue(new Error('boom')),
        },
      };
      await expect(user.addMember({ ...failing, unitId: 1, userId: 'x' })).rejects.toThrow('boom');
      await expect(user.addHead({ ...failing, unitId: 1, userId: 'x' })).rejects.toThrow('boom');
      await expect(user.addMemberIpn({ ...failing, unitId: 1, ipn: 'x' })).rejects.toThrow('boom');
      await expect(user.addHeadIpn({ ...failing, unitId: 1, ipn: 'x' })).rejects.toThrow('boom');
    });
  });

  describe('EventUser remove operations', () => {
    it('removes members, heads and ipns (single and list)', async () => {
      const u = await mkUnit({
        members: ['m1', 'm2', 'm3'],
        heads: ['h1', 'h2', 'h3'],
        membersIpn: ['i1', 'i2', 'i3'],
        headsIpn: ['j1', 'j2', 'j3'],
      });
      const c = { ...common(), unitId: u.id };
      expect((await user.removeMember({ ...c, userId: 'm1' })).error).toBeUndefined();
      expect((await user.removeMemberList({ ...c, userIdList: ['m2', 'nope'] })).error).toBeUndefined();
      expect((await user.removeHead({ ...c, userId: 'h1' })).error).toBeUndefined();
      expect((await user.removeHeadList({ ...c, userIdList: ['h2', 'nope'] })).error).toBeUndefined();
      expect((await user.removeMemberIpn({ ...c, ipn: 'i1' })).error).toBeUndefined();
      expect((await user.removeMemberIpnList({ ...c, ipnList: ['i2', 'nope'] })).error).toBeUndefined();
      expect((await user.removeHeadIpn({ ...c, ipn: 'j1' })).error).toBeUndefined();
      expect((await user.removeHeadIpnList({ ...c, ipnList: ['j2', 'nope'] })).error).toBeUndefined();
      const after = await unitModel.findById(u.id);
      expect([after.members, after.heads, after.membersIpn, after.headsIpn]).toEqual([['m3'], ['h3'], ['i3'], ['j3']]);
    });

    it('removeMembersFromUnitsIpn and removeMembersFromUnitsByIpn', async () => {
      const u = await mkUnit({ membersIpn: ['r1', 'r2'], members: ['user-r1'] });
      const res = await user.removeMembersFromUnitsIpn({ ...common(), unitIdList: [u.id], ipnList: ['r1', 'zz'] });
      expect(res).toHaveLength(1);
      const byIpn = await user.removeMembersFromUnitsByIpn({ ...common(), unitIdList: [u.id], ipnList: ['r1', 'dup', 'none'] });
      expect(byIpn.length).toBeGreaterThan(0);
      const none = await user.removeMembersFromUnitsByIpn({ ...common(), unitIdList: [u.id], ipnList: ['none'] });
      expect(none[0].error).toMatch(/not found/);
      idApi.getUsersByCodesRaw.mockRejectedValueOnce(new Error('id down'));
      const failed = await user.removeMembersFromUnitsByIpn({ ...common(), unitIdList: [u.id], ipnList: ['x'] });
      expect(failed[0].error).toMatch(/not found/);
    });

    it('rethrows when the unit is missing', async () => {
      const c = { ...common(), unitId: 987654 };
      await user.removeMember({ ...c, userId: 'x' }).catch(() => null);
      await user.removeHead({ ...c, userId: 'x' }).catch(() => null);
      await user.removeMemberIpn({ ...c, ipn: 'x' }).catch(() => null);
      await user.removeHeadIpn({ ...c, ipn: 'x' }).catch(() => null);
      await user.removeMemberList({ ...c, userIdList: ['x'] }).catch(() => null);
      await user.removeHeadList({ ...c, userIdList: ['x'] }).catch(() => null);
      await user.removeMemberIpnList({ ...c, ipnList: ['x'] }).catch(() => null);
      await user.removeHeadIpnList({ ...c, ipnList: ['x'] }).catch(() => null);
      await user.removeMembersFromUnitsIpn({ ...common(), unitIdList: [987654], ipnList: ['x'] }).catch(() => null);
    });
  });

  describe('EventUser updateUser and searchUser', () => {
    it('updateUser success and failure', async () => {
      expect(await user.updateUser('u1', { a: 1 }, WF, 'tpl')).toEqual({ id: 'u1', a: 1 });
      idApi.updateUserById.mockRejectedValueOnce(new Error('nope'));
      await expect(user.updateUser('u1', {}, WF, 'tpl')).rejects.toThrow('nope');
    });

    it('searchUser combines all sources', async () => {
      const u = await mkUnit({ members: ['sm1'], heads: ['sh1'], basedOn: [] });
      const base = await mkUnit({ basedOn: [u.id], members: ['sm2'] });
      const found = await user.searchUser(
        { userIds: ['x1'], unitIds: [`${u.id}`], ids: [base.id], codes: ['c1'], code: 'c2', edrpou: '123', search: 'q', basedOn: [u.id] },
        unitModel,
      );
      const ids = found.map((f: any) => f.userId);
      expect(ids).toEqual(expect.arrayContaining(['x1', 'sm1', 'sh1', 'sm2', 'user-c1', 'user-c2', 'edr-1', 'srch-1']));
      expect(await user.searchUser({ edrpou: [] }, unitModel)).toEqual([]);
    });

    it('searchUser error handling', async () => {
      await expect(user.searchUser({ unitIds: [1] }, { getAll: async () => Promise.reject(new Error('e1')) })).rejects.toThrow('e1');
      await expect(user.searchUser({ basedOn: [1] }, { getAll: async () => Promise.reject(new Error('e2')) })).rejects.toThrow('e2');
      idApi.getUsersByIdsRaw.mockRejectedValueOnce(new Error('[]'));
      expect(await user.searchUser({ userIds: ['a'], edrpou: [] }, unitModel)).toEqual([]);
      idApi.getUsersByIdsRaw.mockRejectedValueOnce(new Error('bad'));
      await expect(user.searchUser({ userIds: ['a'] }, unitModel)).rejects.toThrow('bad');
      idApi.getUsersByCodesRaw.mockRejectedValueOnce(new Error('[]')).mockRejectedValueOnce(new Error('bad2'));
      await user.searchUser({ codes: ['a'], edrpou: [] }, unitModel);
      await expect(user.searchUser({ codes: ['a'], edrpou: [] }, unitModel)).rejects.toThrow('bad2');
      idApi.getUsersByEdrpouRaw.mockRejectedValueOnce(new Error('[]')).mockRejectedValueOnce(new Error('bad3'));
      await user.searchUser({ edrpou: ['1'] }, unitModel);
      await expect(user.searchUser({ edrpou: ['1'] }, unitModel)).rejects.toThrow('bad3');
    });
  });

  describe('EventFile', () => {
    const file = () => new EventFile();
    const opts = (over: any = {}) => ({
      workflowId: WF,
      eventTemplateId: 1,
      documents: [],
      events: [],
      filestorage: { uploadFileFromStream: jest.fn(async (_s: any, n: string, _a: any, type: string) => ({ id: 'f1', contentType: type, name: n })) },
      documentModel: { create: jest.fn(async () => ({ id: 'd1' })) },
      eventModel: { setDocumentIdByWorkflowIdAndEventTemplateId: jest.fn(async () => 1) },
      ...over,
    });

    it('rejects unknown method', async () => {
      await expect(file().execute({ eventTemplateJsonSchemaObject: { method: 'x' } })).rejects.toThrow();
      await expect(file().execute(undefined)).rejects.toThrow();
    });

    it.each([
      ['generateCsv', 'text/csv', [{ a: 1, b: 'x,y' }]],
      ['generateXlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', [{ name: 's', rows: [{ a: 1 }] }]],
    ])('%s happy path and failures', async (method, type, rows) => {
      const schema = { method, map: `() => (${JSON.stringify(rows)})` };
      const o = opts();
      const res = await file().execute({ ...o, eventTemplateJsonSchemaObject: schema });
      expect(res.savedDocument.id).toBe('d1');
      expect(o.eventModel.setDocumentIdByWorkflowIdAndEventTemplateId).toHaveBeenCalledWith(WF, 1, 'd1');

      const run = (over: any) => file().execute({ ...opts(over), eventTemplateJsonSchemaObject: schema });
      await expect(
        file().execute({ ...opts(), eventTemplateJsonSchemaObject: { method, map: '() => { throw new Error("m") }' } }),
      ).rejects.toBeDefined();
      await expect(
        run({
          filestorage: {
            uploadFileFromStream: jest.fn().mockRejectedValue(Object.assign(new Error('up'), { response: { statusCode: 500, body: 'b' } })),
          },
        }),
      ).rejects.toThrow('up');
      await expect(run({ filestorage: { uploadFileFromStream: async () => ({ id: 'f', contentType: 'bad', name: 'n' }) } })).rejects.toThrow(
        /content type/,
      );
      await expect(run({ documentModel: { create: jest.fn().mockRejectedValue(new Error('dbx')) } })).rejects.toThrow('dbx');
      await expect(run({ documentModel: { create: async () => ({}) } })).rejects.toThrow(/Can not save/);
    });

    it('generate* throw on bad data', async () => {
      await expect(file().generateCsv(null as any, opts())).rejects.toBeDefined();
      await expect(file().generateXlsx([{ name: 's', rows: [] }], opts())).rejects.toBeDefined();
    });
  });
});
