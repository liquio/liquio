import { LdapUnitSync, normalizeDn } from './ldap_unit_sync';

const USER_ID = 'user-1';
const GROUP_MEMBERS = 'CN=LIQUIO-PROD-UNIT-X,OU=Groups,DC=DOMAIN,DC=LOC';
const GROUP_HEADS = 'CN=LIQUIO-PROD-UNIT-X-HEADS,OU=Groups,DC=DOMAIN,DC=LOC';
const SYNCED_AT = '2026-01-01T10:00:00.000Z';

describe('LdapUnitSync', () => {
  let units: any[];
  let unitModel: any;
  let auth: any;
  let redis: Map<string, string>;
  let sync: LdapUnitSync;
  let accessHistory: any;
  let taskModel: any;

  const makeUnit = (id: number, extra: any = {}) => ({
    id,
    name: `Unit ${id}`,
    members: [],
    heads: [],
    basedOn: [],
    data: {},
    ...extra,
  });

  const userInfo = (groups: string[] | undefined, extra: any = {}) => ({
    userId: USER_ID,
    ipn: '#hash',
    first_name: 'Alice',
    last_name: 'Smith',
    services: { ldap: { data: { groups, syncedAt: SYNCED_AT } } },
    ...extra,
  });

  beforeEach(() => {
    units = [];
    redis = new Map();
    unitModel = {
      getAll: jest.fn(async () => units.map((v) => ({ ...v, members: [...v.members], heads: [...v.heads] }))),
      findById: jest.fn(async (id) => units.find((v) => v.id === id)),
      addMember: jest.fn(async (id, userId) => units.find((v) => v.id === id).members.push(userId)),
      addHead: jest.fn(async (id, userId) => units.find((v) => v.id === id).heads.push(userId)),
      removeMember: jest.fn(async (id, userId) => {
        const unit = units.find((v) => v.id === id);
        unit.members = unit.members.filter((v) => v !== userId);
      }),
      removeHead: jest.fn(async (id, userId) => {
        const unit = units.find((v) => v.id === id);
        unit.heads = unit.heads.filter((v) => v !== userId);
      }),
      invalidateCache: jest.fn(),
    };
    auth = { ldapGroupsExist: jest.fn(async (dns) => dns) };
    accessHistory = { create: jest.fn() };
    taskModel = { removePerformerUserFromTasks: jest.fn() };
    (global as any).log = { save: jest.fn() };
    (global as any).models = { accessHistory, task: taskModel };
    (global as any).redisClient = {
      get: jest.fn(async (key) => redis.get(key) ?? null),
      set: jest.fn(async (key, value) => {
        redis.set(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }),
    };
    sync = new LdapUnitSync({ unitModel, auth });
  });

  describe('normalizeDn', () => {
    it('trims, lowercases and drops whitespace around separators', () => {
      expect(normalizeDn('  CN = Group , OU=Groups ,DC=Domain  ')).toBe('cn=group,ou=groups,dc=domain');
    });
  });

  describe('sync', () => {
    it('adds the user as a member when a member group matches', async () => {
      units = [makeUnit(1, { data: { ldap: { memberGroups: [GROUP_MEMBERS] } } })];

      const result = await sync.sync(userInfo([GROUP_MEMBERS]));

      expect(units[0].members).toEqual([USER_ID]);
      expect(result).toEqual({ changed: true, complete: true });
      expect(unitModel.invalidateCache).toHaveBeenCalled();
      expect(accessHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, operationType: 'added-to-member-unit', unitId: 1, initUserName: 'ldap-sync' }),
      );
    });

    it('adds the user as a head when a head group matches', async () => {
      units = [makeUnit(1, { data: { ldap: { headGroups: [GROUP_HEADS] } } })];

      await sync.sync(userInfo([GROUP_HEADS]));

      expect(units[0].heads).toEqual([USER_ID]);
      expect(units[0].members).toEqual([]);
      expect(accessHistory.create).toHaveBeenCalledWith(expect.objectContaining({ operationType: 'added-to-head-unit', unitId: 1 }));
    });

    it('does not add the user twice', async () => {
      units = [makeUnit(1, { members: [USER_ID], data: { ldap: { memberGroups: [GROUP_MEMBERS] } } })];

      const result = await sync.sync(userInfo([GROUP_MEMBERS]));

      expect(unitModel.addMember).not.toHaveBeenCalled();
      expect(result.changed).toBe(false);
      expect(unitModel.invalidateCache).not.toHaveBeenCalled();
    });

    it('does not add when the cached unit list is stale but the fresh one already has the user', async () => {
      const unit = makeUnit(1, { data: { ldap: { memberGroups: [GROUP_MEMBERS] } } });
      units = [{ ...unit, members: [USER_ID] }];
      unitModel.getAll.mockResolvedValue([unit]);

      await sync.sync(userInfo([GROUP_MEMBERS]));

      expect(unitModel.addMember).not.toHaveBeenCalled();
    });

    it('removes a member when none of the member groups is left', async () => {
      units = [makeUnit(1, { members: [USER_ID], data: { ldap: { memberGroups: [GROUP_MEMBERS] } } })];

      const result = await sync.sync(userInfo([]));

      expect(units[0].members).toEqual([]);
      expect(result).toEqual({ changed: true, complete: true });
      expect(taskModel.removePerformerUserFromTasks).toHaveBeenCalledWith(USER_ID, 1);
      expect(accessHistory.create).toHaveBeenCalledWith(expect.objectContaining({ operationType: 'deleted-from-member-unit', unitId: 1 }));
    });

    it('removes a head when none of the head groups is left, keeping the membership', async () => {
      units = [makeUnit(1, { members: [USER_ID], heads: [USER_ID], data: { ldap: { memberGroups: [GROUP_MEMBERS], headGroups: [GROUP_HEADS] } } })];

      await sync.sync(userInfo([GROUP_MEMBERS]));

      expect(units[0].heads).toEqual([]);
      expect(units[0].members).toEqual([USER_ID]);
      expect(taskModel.removePerformerUserFromTasks).not.toHaveBeenCalled();
      expect(accessHistory.create).toHaveBeenCalledWith(expect.objectContaining({ operationType: 'deleted-from-head-unit', unitId: 1 }));
    });

    it('leaves units without ldap groups untouched', async () => {
      units = [
        makeUnit(1, { members: [USER_ID], heads: [USER_ID] }),
        makeUnit(2, { members: [USER_ID], data: { ldap: { memberGroups: [], headGroups: [] } } }),
        makeUnit(3, { data: { ldap: { dn: 'ou=legacy' } } }),
      ];

      const result = await sync.sync(userInfo([]));

      expect(units[0].members).toEqual([USER_ID]);
      expect(units[0].heads).toEqual([USER_ID]);
      expect(units[1].members).toEqual([USER_ID]);
      expect(result.changed).toBe(false);
      expect(auth.ldapGroupsExist).not.toHaveBeenCalled();
    });

    it('does not manage the member list of a unit that has only head groups', async () => {
      units = [makeUnit(1, { members: [USER_ID], data: { ldap: { headGroups: [GROUP_HEADS] } } })];

      await sync.sync(userInfo([]));

      expect(units[0].members).toEqual([USER_ID]);
    });

    it('compares DNs ignoring case and whitespace', async () => {
      units = [makeUnit(1, { data: { ldap: { memberGroups: ['cn=liquio-prod-unit-x, ou=groups, dc=domain, dc=loc'] } } })];

      await sync.sync(userInfo(['  CN=LIQUIO-PROD-UNIT-X,OU=Groups,DC=DOMAIN,DC=LOC ']));

      expect(units[0].members).toEqual([USER_ID]);
    });

    it('keeps the member when the configured group no longer exists, and warns', async () => {
      units = [makeUnit(1, { members: [USER_ID], data: { ldap: { memberGroups: [GROUP_MEMBERS] } } })];
      auth.ldapGroupsExist.mockResolvedValue([]);

      const result = await sync.sync(userInfo([]));

      expect(units[0].members).toEqual([USER_ID]);
      expect(result).toEqual({ changed: false, complete: false });
      expect(global.log.save).toHaveBeenCalledWith('ldap-unit-sync|group-not-found', { unitId: 1, dn: GROUP_MEMBERS, level: 'member' }, 'warn');
      expect(accessHistory.create).not.toHaveBeenCalled();
    });

    it('keeps the member when only one of several configured groups no longer exists', async () => {
      const other = 'CN=OTHER,OU=Groups,DC=DOMAIN,DC=LOC';
      units = [makeUnit(1, { members: [USER_ID], data: { ldap: { memberGroups: [GROUP_MEMBERS, other] } } })];
      auth.ldapGroupsExist.mockResolvedValue([GROUP_MEMBERS]);

      await sync.sync(userInfo([]));

      expect(units[0].members).toEqual([USER_ID]);
      expect(global.log.save).toHaveBeenCalledWith('ldap-unit-sync|group-not-found', { unitId: 1, dn: other, level: 'member' }, 'warn');
    });

    it('keeps the head when the configured head group no longer exists', async () => {
      units = [makeUnit(1, { heads: [USER_ID], data: { ldap: { headGroups: [GROUP_HEADS] } } })];
      auth.ldapGroupsExist.mockResolvedValue([]);

      await sync.sync(userInfo([]));

      expect(units[0].heads).toEqual([USER_ID]);
    });

    it('still adds members when a configured group does not exist', async () => {
      units = [makeUnit(1, { data: { ldap: { memberGroups: [GROUP_MEMBERS] } } })];
      auth.ldapGroupsExist.mockResolvedValue([]);

      await sync.sync(userInfo([GROUP_MEMBERS]));

      expect(units[0].members).toEqual([USER_ID]);
      expect(auth.ldapGroupsExist).not.toHaveBeenCalled();
    });

    it('removes nobody when the groups check fails', async () => {
      units = [makeUnit(1, { members: [USER_ID], heads: [USER_ID], data: { ldap: { memberGroups: [GROUP_MEMBERS], headGroups: [GROUP_HEADS] } } })];
      auth.ldapGroupsExist.mockRejectedValue(new Error('id-api down'));

      const result = await sync.sync(userInfo([]));

      expect(units[0].members).toEqual([USER_ID]);
      expect(units[0].heads).toEqual([USER_ID]);
      expect(result).toEqual({ changed: false, complete: false });
      expect(global.log.save).toHaveBeenCalledWith('ldap-unit-sync|group-check-failed', { unitId: 1, error: 'id-api down' }, 'error');
      expect(redis.size).toBe(0);
    });

    it('caches the groups check', async () => {
      units = [
        makeUnit(1, { members: [USER_ID], data: { ldap: { memberGroups: [GROUP_MEMBERS] } } }),
        makeUnit(2, { members: [USER_ID], data: { ldap: { memberGroups: [GROUP_MEMBERS.toLowerCase()] } } }),
      ];

      await sync.sync(userInfo([]));

      expect(auth.ldapGroupsExist).toHaveBeenCalledTimes(1);
      expect(units[0].members).toEqual([]);
      expect(units[1].members).toEqual([]);
      expect((global.redisClient.set as jest.Mock).mock.calls[0][2]).toBe(300);
    });

    it('does nothing when the user has no ldap service', async () => {
      units = [makeUnit(1, { members: [USER_ID], data: { ldap: { memberGroups: [GROUP_MEMBERS] } } })];

      const result = await sync.sync({ userId: USER_ID, services: { eds: {} } });

      expect(result).toEqual({ changed: false, complete: true });
      expect(unitModel.getAll).not.toHaveBeenCalled();
      expect(units[0].members).toEqual([USER_ID]);
    });

    it('removes nobody when the ldap service has no groups list', async () => {
      units = [makeUnit(1, { members: [USER_ID], data: { ldap: { memberGroups: [GROUP_MEMBERS] } } })];

      const result = await sync.sync(userInfo(undefined));

      expect(units[0].members).toEqual([USER_ID]);
      expect(result.complete).toBe(false);
    });

    it('does not fail when a unit update throws, and reports an incomplete sync', async () => {
      units = [
        makeUnit(1, { data: { ldap: { memberGroups: [GROUP_MEMBERS] } } }),
        makeUnit(2, { data: { ldap: { memberGroups: [GROUP_MEMBERS] } } }),
      ];
      unitModel.addMember.mockRejectedValueOnce(new Error('db down'));

      const result = await sync.sync(userInfo([GROUP_MEMBERS]));

      expect(result.complete).toBe(false);
      expect(units[1].members).toEqual([USER_ID]);
      expect(redis.get(`ldap-unit-sync.${USER_ID}`)).toBeUndefined();
    });

    it('does not fail when the units cannot be loaded', async () => {
      unitModel.getAll.mockRejectedValue(new Error('db down'));

      const result = await sync.sync(userInfo([GROUP_MEMBERS]));

      expect(result.complete).toBe(false);
    });

    it('stores the synced marker after a complete sync', async () => {
      units = [makeUnit(1, { data: { ldap: { memberGroups: [GROUP_MEMBERS] } } })];

      await sync.sync(userInfo([GROUP_MEMBERS]));

      expect(redis.get(`ldap-unit-sync.${USER_ID}`)).toBe(SYNCED_AT);
    });

    describe('base units', () => {
      it('mirrors an added member to a plain base unit', async () => {
        units = [makeUnit(1, { basedOn: [2], data: { ldap: { memberGroups: [GROUP_MEMBERS] } } }), makeUnit(2)];

        await sync.sync(userInfo([GROUP_MEMBERS]));

        expect(units[1].members).toEqual([USER_ID]);
        expect(accessHistory.create).toHaveBeenCalledWith(expect.objectContaining({ operationType: 'added-to-member-unit', unitId: 2 }));
      });

      it('mirrors an added head to a plain base unit', async () => {
        units = [makeUnit(1, { basedOn: [2], data: { ldap: { headGroups: [GROUP_HEADS] } } }), makeUnit(2)];

        await sync.sync(userInfo([GROUP_HEADS]));

        expect(units[1].heads).toEqual([USER_ID]);
      });

      it('does not mirror to a base unit that is LDAP-managed', async () => {
        units = [
          makeUnit(1, { basedOn: [2], data: { ldap: { memberGroups: [GROUP_MEMBERS] } } }),
          makeUnit(2, { data: { ldap: { memberGroups: ['CN=OTHER,DC=DOMAIN,DC=LOC'] } } }),
        ];

        await sync.sync(userInfo([GROUP_MEMBERS]));

        expect(units[0].members).toEqual([USER_ID]);
        expect(units[1].members).toEqual([]);
      });

      it('does not add to a base unit the user already belongs to', async () => {
        units = [makeUnit(1, { basedOn: [2], data: { ldap: { memberGroups: [GROUP_MEMBERS] } } }), makeUnit(2, { members: [USER_ID] })];

        await sync.sync(userInfo([GROUP_MEMBERS]));

        expect(unitModel.addMember).toHaveBeenCalledTimes(1);
        expect(units[1].members).toEqual([USER_ID]);
      });

      it('leaves base units alone when the user is removed', async () => {
        units = [
          makeUnit(1, { members: [USER_ID], basedOn: [2], data: { ldap: { memberGroups: [GROUP_MEMBERS] } } }),
          makeUnit(2, { members: [USER_ID], heads: [USER_ID] }),
        ];

        await sync.sync(userInfo([]));

        expect(units[0].members).toEqual([]);
        expect(units[1].members).toEqual([USER_ID]);
        expect(units[1].heads).toEqual([USER_ID]);
      });
    });
  });

  describe('syncIfChanged', () => {
    beforeEach(() => {
      units = [makeUnit(1, { data: { ldap: { memberGroups: [GROUP_MEMBERS] } } })];
    });

    it('syncs when the user was never synced', async () => {
      const result = await sync.syncIfChanged(userInfo([GROUP_MEMBERS]));

      expect(result.changed).toBe(true);
      expect(units[0].members).toEqual([USER_ID]);
    });

    it('runs once and is skipped while syncedAt is unchanged', async () => {
      await sync.syncIfChanged(userInfo([GROUP_MEMBERS]));
      unitModel.getAll.mockClear();

      const result = await sync.syncIfChanged(userInfo([GROUP_MEMBERS]));

      expect(result).toEqual({ changed: false, complete: true });
      expect(unitModel.getAll).not.toHaveBeenCalled();
    });

    it('runs again when syncedAt is newer than the stored one', async () => {
      await sync.syncIfChanged(userInfo([GROUP_MEMBERS]));
      unitModel.getAll.mockClear();
      const newer = { services: { ldap: { data: { groups: [], syncedAt: '2026-01-01T10:15:00.000Z' } } } };

      const result = await sync.syncIfChanged(userInfo([], newer));

      expect(unitModel.getAll).toHaveBeenCalled();
      expect(result.changed).toBe(true);
      expect(units[0].members).toEqual([]);
      expect(redis.get(`ldap-unit-sync.${USER_ID}`)).toBe('2026-01-01T10:15:00.000Z');
    });

    it('retries on the next call when the previous sync was incomplete', async () => {
      auth.ldapGroupsExist.mockRejectedValueOnce(new Error('id-api down'));
      units[0].members = [USER_ID];
      await sync.syncIfChanged(userInfo([]));

      const result = await sync.syncIfChanged(userInfo([]));

      expect(result.changed).toBe(true);
      expect(units[0].members).toEqual([]);
    });

    it('does nothing without syncedAt', async () => {
      const result = await sync.syncIfChanged({ userId: USER_ID, services: { ldap: { data: { groups: [GROUP_MEMBERS] } } } });

      expect(result.changed).toBe(false);
      expect(unitModel.getAll).not.toHaveBeenCalled();
    });

    it('does nothing without redis', async () => {
      (global as any).redisClient = undefined;

      const result = await sync.syncIfChanged(userInfo([GROUP_MEMBERS]));

      expect(result.changed).toBe(false);
      expect(unitModel.getAll).not.toHaveBeenCalled();
    });

    it('does nothing for a user without the ldap service', async () => {
      const result = await sync.syncIfChanged({ userId: USER_ID, services: {} });

      expect(result.changed).toBe(false);
      expect(unitModel.getAll).not.toHaveBeenCalled();
    });
  });
});
