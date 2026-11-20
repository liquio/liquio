const mockLog = { save: jest.fn() };
const mockServices: Record<string, any> = {};
const mockModels: Record<string, any> = {};

jest.mock('./base_service', () => ({
  BaseService: class MockBaseService {
    config: any;
    log = mockLog;
    constructor(config: any) {
      this.config = config;
    }
    service(name: string) {
      return mockServices[name];
    }
    model(name: string) {
      return mockModels[name];
    }
  },
}));

import * as ldapts from 'ldapts';
import { Op } from 'sequelize';

import { normalizeDn } from './ldap.service';
import { LdapDirectoryError, LdapSyncService } from './ldap_sync.service';

const ACCESS_GROUP = 'CN=LIQUIO-PROD-USERS,OU=Groups,DC=DOMAIN,DC=LOC';
const UNIT_GROUP = 'CN=LIQUIO-PROD-UNIT-X,OU=Groups,DC=DOMAIN,DC=LOC';
const OTHER_GROUP = 'CN=SOMETHING-ELSE,OU=Groups,DC=DOMAIN,DC=LOC';
const DN = 'CN=Alice,OU=Staff,DC=DOMAIN,DC=LOC';
const SYNCED_AT = '2026-01-01T00:00:00.000Z';

const makeRow = (id: number, data: Record<string, unknown> = {}) => ({
  id,
  userId: `user${id}`.padEnd(24, '0'),
  provider: 'ldap',
  provider_id: `guid${id}`,
  data: {
    sAMAccountName: 'alice',
    userPrincipalName: 'alice@domain.loc',
    dn: DN,
    cn: 'Alice',
    groups: [ACCESS_GROUP],
    accessGroups: [ACCESS_GROUP],
    syncedAt: SYNCED_AT,
    ...data,
  },
});

const makeEntry = (overrides: Record<string, unknown> = {}) => ({
  dn: DN,
  cn: 'Alice',
  sAMAccountName: 'alice',
  userPrincipalName: 'alice@domain.loc',
  ...overrides,
});

describe('LdapSyncService', () => {
  let service: LdapSyncService;
  let ldap: any;
  let auth: any;
  let redis: any;
  let userServices: any;
  let rows: ReturnType<typeof makeRow>[];
  let ldapConfig: any;

  const createService = () => new LdapSyncService({ auth_providers: { ldap: ldapConfig } } as any, {} as any, {} as any);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    ldapConfig = { isEnabled: true, accessGroups: [ACCESS_GROUP], sync: { isEnabled: true, intervalMinutes: 15 } };
    rows = [makeRow(1)];

    ldap = {
      isEnabled: true,
      findUserById: jest.fn().mockResolvedValue(makeEntry()),
      isAccountDisabled: jest.fn().mockReturnValue(false),
      getUserGroups: jest.fn().mockResolvedValue([ACCESS_GROUP]),
      isSameDn: jest.fn((a: string, b: string) => normalizeDn(a) === normalizeDn(b)),
    };
    auth = {
      revokeUserAccess: jest.fn().mockResolvedValue({ accessTokens: 1, refreshTokens: 1, sessions: 1 }),
      invalidateUserCache: jest.fn().mockResolvedValue(undefined),
      invalidateUserTokenCache: jest.fn().mockResolvedValue(1),
    };
    redis = {
      isEnabled: true,
      acquireLock: jest.fn().mockResolvedValue('lock-token'),
      extendLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(true),
    };
    userServices = {
      findAll: jest.fn(async ({ where, limit }: any) =>
        rows
          .filter((row) => row.id > where.id[Op.gt])
          .slice(0, limit)
          .map((row) => ({ dataValues: row })),
      ),
      findOne: jest.fn(async ({ where }: any) => {
        const row = rows.find((r) => r.userId === where.userId);
        return row ? { dataValues: row } : null;
      }),
      update: jest.fn().mockResolvedValue([1]),
    };

    mockServices.ldap = ldap;
    mockServices.auth = auth;
    mockServices.redis = redis;
    mockModels.userServices = userServices;

    service = createService();
  });

  afterEach(async () => {
    await service.stop();
  });

  const savedData = (): any => userServices.update.mock.calls[0][0].data;
  const logged = (type: string) => mockLog.save.mock.calls.filter(([key]) => key === type);

  describe('checkUser', () => {
    it('revokes a user who was deleted in the directory', async () => {
      ldap.findUserById.mockResolvedValue(null);

      const outcome = await service.checkUser(rows[0]);

      expect(outcome).toEqual({ userId: rows[0].userId, status: 'revoked', reason: 'deleted' });
      expect(auth.revokeUserAccess).toHaveBeenCalledWith(rows[0].userId);
      expect(savedData()).toMatchObject({ groups: [], accessGroups: [], dn: DN });
      expect(savedData().syncedAt).not.toBe(SYNCED_AT);
      expect(userServices.update.mock.calls[0][1]).toEqual({ where: { id: 1 } });
      expect(auth.invalidateUserCache).toHaveBeenCalledWith(rows[0].userId);
      expect(logged('ldap-sync|access-revoked')[0][1]).toMatchObject({ userId: rows[0].userId, reason: 'deleted' });
    });

    it('revokes a user whose account is disabled', async () => {
      ldap.isAccountDisabled.mockReturnValue(true);

      const outcome = await service.checkUser(rows[0]);

      expect(outcome).toMatchObject({ status: 'revoked', reason: 'disabled' });
      expect(auth.revokeUserAccess).toHaveBeenCalledTimes(1);
      expect(ldap.getUserGroups).not.toHaveBeenCalled();
      expect(logged('ldap-sync|access-revoked')[0][1]).toMatchObject({ reason: 'disabled' });
    });

    it('revokes a user who is no longer in any access group', async () => {
      ldap.getUserGroups.mockResolvedValue([OTHER_GROUP]);

      const outcome = await service.checkUser(rows[0]);

      expect(outcome).toMatchObject({ status: 'revoked', reason: 'not-in-access-group' });
      expect(savedData()).toMatchObject({ groups: [], accessGroups: [] });
      expect(logged('ldap-sync|access-revoked')[0][1]).toMatchObject({ reason: 'not-in-access-group' });
    });

    it('revokes before it marks the user as revoked', async () => {
      ldap.findUserById.mockResolvedValue(null);
      auth.revokeUserAccess.mockRejectedValue(new Error('redis down'));

      await expect(service.checkUser(rows[0])).rejects.toThrow('redis down');

      expect(userServices.update).not.toHaveBeenCalled();
    });

    it('matches the access group regardless of DN case and spacing', async () => {
      ldap.getUserGroups.mockResolvedValue(['cn=liquio-prod-users, ou=groups, dc=domain, dc=loc']);

      const outcome = await service.checkUser(rows[0]);

      expect(outcome.status).not.toBe('revoked');
      expect(auth.revokeUserAccess).not.toHaveBeenCalled();
    });

    it('updates groups and busts the task cache when the groups changed, without revoking', async () => {
      ldap.getUserGroups.mockResolvedValue([ACCESS_GROUP, UNIT_GROUP]);

      const outcome = await service.checkUser(rows[0]);

      expect(outcome).toEqual({ userId: rows[0].userId, status: 'changed' });
      expect(auth.revokeUserAccess).not.toHaveBeenCalled();
      expect(savedData()).toMatchObject({ groups: [ACCESS_GROUP, UNIT_GROUP], accessGroups: [ACCESS_GROUP] });
      expect(savedData().syncedAt).not.toBe(SYNCED_AT);
      expect(auth.invalidateUserCache).toHaveBeenCalledWith(rows[0].userId);
      expect(auth.invalidateUserTokenCache).toHaveBeenCalledWith(rows[0].userId);
      expect(logged('ldap-sync|groups-changed')[0][1]).toMatchObject({ userId: rows[0].userId, added: 1, removed: 0 });
    });

    it('treats a group removed from the user as a change', async () => {
      rows = [makeRow(1, { groups: [ACCESS_GROUP, UNIT_GROUP] })];

      const outcome = await service.checkUser(rows[0]);

      expect(outcome.status).toBe('changed');
      expect(savedData().groups).toEqual([ACCESS_GROUP]);
      expect(logged('ldap-sync|groups-changed')[0][1]).toMatchObject({ added: 0, removed: 1 });
    });

    it('does not write anything when nothing changed', async () => {
      const outcome = await service.checkUser(rows[0]);

      expect(outcome).toEqual({ userId: rows[0].userId, status: 'unchanged' });
      expect(userServices.update).not.toHaveBeenCalled();
      expect(auth.invalidateUserCache).not.toHaveBeenCalled();
      expect(auth.invalidateUserTokenCache).not.toHaveBeenCalled();
    });

    it('ignores the order and the case of groups when comparing', async () => {
      rows = [makeRow(1, { groups: [ACCESS_GROUP, UNIT_GROUP] })];
      ldap.getUserGroups.mockResolvedValue([UNIT_GROUP.toLowerCase(), ACCESS_GROUP.toUpperCase()]);

      const outcome = await service.checkUser(rows[0]);

      expect(outcome.status).toBe('unchanged');
      expect(userServices.update).not.toHaveBeenCalled();
    });

    it('updates changed attributes but keeps syncedAt and the task cache', async () => {
      const moved = 'CN=Alice,OU=Other,DC=DOMAIN,DC=LOC';
      ldap.findUserById.mockResolvedValue(makeEntry({ dn: moved, userPrincipalName: 'alice@new.loc' }));

      const outcome = await service.checkUser(rows[0]);

      expect(outcome.status).toBe('unchanged');
      expect(savedData()).toMatchObject({ dn: moved, userPrincipalName: 'alice@new.loc', syncedAt: SYNCED_AT });
      expect(auth.invalidateUserCache).toHaveBeenCalledWith(rows[0].userId);
      expect(auth.invalidateUserTokenCache).not.toHaveBeenCalled();
    });

    it('does not revoke an already revoked user again', async () => {
      rows = [makeRow(1, { groups: [], accessGroups: [] })];
      ldap.getUserGroups.mockResolvedValue([OTHER_GROUP]);

      const outcome = await service.checkUser(rows[0]);

      expect(outcome).toMatchObject({ status: 'already-revoked', reason: 'not-in-access-group' });
      expect(auth.revokeUserAccess).not.toHaveBeenCalled();
      expect(userServices.update).not.toHaveBeenCalled();
    });

    it('removes leftover tokens of an already revoked user when asked to', async () => {
      rows = [makeRow(1, { groups: [], accessGroups: [] })];
      ldap.findUserById.mockResolvedValue(null);

      const outcome = await service.checkUser(rows[0], { ensureRevoked: true });

      expect(outcome.status).toBe('already-revoked');
      expect(auth.revokeUserAccess).toHaveBeenCalledTimes(1);
      expect(userServices.update).not.toHaveBeenCalled();
    });

    it('restores the groups of a revoked user who got access back', async () => {
      rows = [makeRow(1, { groups: [], accessGroups: [] })];

      const outcome = await service.checkUser(rows[0]);

      expect(outcome.status).toBe('changed');
      expect(savedData()).toMatchObject({ groups: [ACCESS_GROUP], accessGroups: [ACCESS_GROUP] });
    });

    it('throws a connection level error and changes nothing when the directory is unreachable', async () => {
      ldap.findUserById.mockRejectedValue(new Error('connect ECONNREFUSED'));

      const error = await service.checkUser(rows[0]).catch((e) => e);

      expect(error).toBeInstanceOf(LdapDirectoryError);
      expect(error.connectionLevel).toBe(true);
      expect(auth.revokeUserAccess).not.toHaveBeenCalled();
      expect(userServices.update).not.toHaveBeenCalled();
    });

    it('throws a lookup level error for an ldap result code', async () => {
      ldap.findUserById.mockRejectedValue(new ldapts.InsufficientAccessError());

      const error = await service.checkUser(rows[0]).catch((e) => e);

      expect(error).toBeInstanceOf(LdapDirectoryError);
      expect(error.connectionLevel).toBe(false);
      expect(auth.revokeUserAccess).not.toHaveBeenCalled();
    });

    it('does not treat a failed group search as lost access', async () => {
      ldap.getUserGroups.mockRejectedValue(new Error('timeout'));

      await expect(service.checkUser(rows[0])).rejects.toBeInstanceOf(LdapDirectoryError);

      expect(auth.revokeUserAccess).not.toHaveBeenCalled();
      expect(userServices.update).not.toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('checks all users in batches and logs the summary', async () => {
      rows = Array.from({ length: 150 }, (_, i) => makeRow(i + 1));
      ldap.findUserById.mockImplementation(async (id: string) => (id === 'guid2' ? null : makeEntry()));
      ldap.getUserGroups.mockImplementation(async () => [ACCESS_GROUP, UNIT_GROUP]);
      rows[4] = makeRow(5, { groups: [ACCESS_GROUP, UNIT_GROUP] });

      const summary = await service.run();

      expect(userServices.findAll).toHaveBeenCalledTimes(3);
      expect(userServices.findAll.mock.calls[0][0]).toMatchObject({ order: [['id', 'ASC']], limit: 100 });
      expect(summary).toMatchObject({ checked: 150, revoked: 1, changed: 148, errors: 0, aborted: false });
      expect(logged('ldap-sync|done')[0][1]).toMatchObject({ checked: 150, revoked: 1, changed: 148, errors: 0, durationMs: expect.any(Number) });
    });

    it('takes the lock and releases it with the same token', async () => {
      await service.run();

      expect(redis.acquireLock).toHaveBeenCalledWith('ldap-sync', 300);
      expect(redis.releaseLock).toHaveBeenCalledWith('ldap-sync', 'lock-token');
    });

    it('releases the lock when the run fails', async () => {
      userServices.findAll.mockRejectedValue(new Error('db down'));

      await expect(service.run()).rejects.toThrow('db down');

      expect(redis.releaseLock).toHaveBeenCalledWith('ldap-sync', 'lock-token');
    });

    it('still returns the summary when releasing the lock fails', async () => {
      redis.releaseLock.mockRejectedValue(new Error('redis down'));

      const summary = await service.run();

      expect(summary).toMatchObject({ checked: 1, aborted: false });
      expect(logged('ldap-sync|release-lock-error')[0][1]).toEqual({ error: 'redis down' });
    });

    it('extends the lock and goes on when it is still ours', async () => {
      jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
      rows = [makeRow(1), makeRow(2)];
      ldap.findUserById.mockImplementation(async () => {
        jest.advanceTimersByTime(200 * 1000);
        return makeEntry();
      });

      const summary = await service.run();

      expect(summary).toMatchObject({ checked: 2, aborted: false });
      expect(redis.extendLock).toHaveBeenCalledWith('ldap-sync', 'lock-token', 300);
    });

    it('does nothing when another replica holds the lock', async () => {
      redis.acquireLock.mockResolvedValue(null);

      const summary = await service.run();

      expect(summary).toBeUndefined();
      expect(userServices.findAll).not.toHaveBeenCalled();
      expect(redis.releaseLock).not.toHaveBeenCalled();
      expect(logged('ldap-sync|skipped')[0][1]).toEqual({ reason: 'lock-held' });
    });

    it('does nothing when redis is disabled and logs it once', async () => {
      redis.isEnabled = false;

      expect(await service.run()).toBeUndefined();
      expect(await service.run()).toBeUndefined();

      expect(redis.acquireLock).not.toHaveBeenCalled();
      expect(userServices.findAll).not.toHaveBeenCalled();
      expect(logged('ldap-sync|disabled')).toHaveLength(1);
    });

    it('does nothing when sync is disabled', async () => {
      ldapConfig.sync.isEnabled = false;

      expect(await service.run()).toBeUndefined();

      expect(redis.acquireLock).not.toHaveBeenCalled();
    });

    it('skips a run while the previous one is still going on in this process', async () => {
      let finish: () => void = () => undefined;
      ldap.findUserById.mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = () => resolve(makeEntry());
          }),
      );

      const first = service.run();
      await new Promise((resolve) => setImmediate(resolve));
      const second = await service.run();
      finish();
      await first;

      expect(second).toBeUndefined();
      expect(redis.acquireLock).toHaveBeenCalledTimes(1);
      expect(logged('ldap-sync|skipped')[0][1]).toEqual({ reason: 'already-running' });
    });

    it('aborts the run and changes nothing when the directory connection fails', async () => {
      rows = [makeRow(1), makeRow(2), makeRow(3)];
      ldap.findUserById.mockRejectedValue(new Error('connect ECONNREFUSED'));

      const summary = await service.run();

      expect(summary).toMatchObject({ checked: 0, revoked: 0, errors: 1, aborted: true });
      expect(ldap.findUserById).toHaveBeenCalledTimes(1);
      expect(auth.revokeUserAccess).not.toHaveBeenCalled();
      expect(userServices.update).not.toHaveBeenCalled();
      expect(redis.releaseLock).toHaveBeenCalled();
    });

    it('leaves a user with a search error untouched and processes the others', async () => {
      rows = [makeRow(1), makeRow(2), makeRow(3)];
      ldap.findUserById.mockImplementation(async (id: string) => {
        if (id === 'guid2') {
          throw new ldapts.InsufficientAccessError();
        }
        return id === 'guid1' ? null : makeEntry();
      });

      const summary = await service.run();

      expect(summary).toMatchObject({ checked: 2, revoked: 1, errors: 1, aborted: false });
      expect(auth.revokeUserAccess).toHaveBeenCalledTimes(1);
      expect(auth.revokeUserAccess).toHaveBeenCalledWith(rows[0].userId);
    });

    it('aborts after several lookup errors in a row', async () => {
      rows = Array.from({ length: 10 }, (_, i) => makeRow(i + 1));
      ldap.findUserById.mockRejectedValue(new ldapts.InsufficientAccessError());

      const summary = await service.run();

      expect(summary).toMatchObject({ checked: 0, errors: 5, aborted: true });
      expect(userServices.update).not.toHaveBeenCalled();
    });

    it('counts a failed revoke as an error and goes on', async () => {
      rows = [makeRow(1), makeRow(2)];
      ldap.findUserById.mockResolvedValue(null);
      auth.revokeUserAccess.mockRejectedValueOnce(new Error('db error')).mockResolvedValue({ accessTokens: 0, refreshTokens: 0, sessions: 0 });

      const summary = await service.run();

      expect(summary).toMatchObject({ checked: 1, revoked: 1, errors: 1, aborted: false });
    });

    it('aborts when the lock is lost during the run', async () => {
      jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
      rows = [makeRow(1), makeRow(2)];
      ldap.findUserById.mockImplementation(async () => {
        jest.advanceTimersByTime(200 * 1000);
        return makeEntry();
      });
      redis.extendLock.mockResolvedValue(false);

      const summary = await service.run();

      expect(summary).toMatchObject({ checked: 1, aborted: true });
      expect(logged('ldap-sync|aborted')[0][1]).toEqual({ reason: 'lock-lost' });
    });
  });

  describe('schedule', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('runs the job every configured interval', async () => {
      ldapConfig.sync.intervalMinutes = 5;
      const spy = jest.spyOn(service, 'run').mockResolvedValue(undefined);

      service.schedule();
      jest.advanceTimersByTime(4 * 60 * 1000);
      expect(spy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(60 * 1000);
      expect(spy).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(5 * 60 * 1000);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('logs a failed scheduled run and keeps the timer going', async () => {
      ldapConfig.sync.intervalMinutes = 5;
      const spy = jest.spyOn(service, 'run').mockRejectedValue(new Error('db down'));

      service.schedule();
      await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
      await jest.advanceTimersByTimeAsync(5 * 60 * 1000);

      expect(spy).toHaveBeenCalledTimes(2);
      expect(logged('ldap-sync|run-error')[0][1]).toEqual({ error: 'db down' });
    });

    it('defaults to 15 minutes', () => {
      delete ldapConfig.sync.intervalMinutes;

      expect(service.intervalMinutes).toBe(15);
    });

    it('does not schedule when sync is disabled', () => {
      ldapConfig.sync.isEnabled = false;
      const spy = jest.spyOn(service, 'run').mockResolvedValue(undefined);

      service.schedule();
      jest.advanceTimersByTime(60 * 60 * 1000);

      expect(spy).not.toHaveBeenCalled();
    });

    it('does not schedule when the ldap provider is disabled', () => {
      ldap.isEnabled = false;
      const spy = jest.spyOn(service, 'run').mockResolvedValue(undefined);

      service.schedule();
      jest.advanceTimersByTime(60 * 60 * 1000);

      expect(spy).not.toHaveBeenCalled();
    });

    it('does not schedule without redis and logs it', () => {
      redis.isEnabled = false;
      const spy = jest.spyOn(service, 'run').mockResolvedValue(undefined);

      service.schedule();
      jest.advanceTimersByTime(60 * 60 * 1000);

      expect(spy).not.toHaveBeenCalled();
      expect(logged('ldap-sync|disabled')).toHaveLength(1);
    });

    it('stops the job', async () => {
      const spy = jest.spyOn(service, 'run').mockResolvedValue(undefined);

      service.schedule();
      await service.stop();
      jest.advanceTimersByTime(60 * 60 * 1000);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('isRefreshAllowed', () => {
    it('refuses and revokes when the access is lost', async () => {
      ldap.getUserGroups.mockResolvedValue([OTHER_GROUP]);

      expect(await service.isRefreshAllowed(rows[0].userId)).toBe(false);

      expect(auth.revokeUserAccess).toHaveBeenCalledWith(rows[0].userId);
    });

    it('refuses an already revoked user and removes leftover tokens', async () => {
      rows = [makeRow(1, { groups: [], accessGroups: [] })];
      ldap.findUserById.mockResolvedValue(null);

      expect(await service.isRefreshAllowed(rows[0].userId)).toBe(false);

      expect(auth.revokeUserAccess).toHaveBeenCalledTimes(1);
    });

    it('allows when the access is kept', async () => {
      expect(await service.isRefreshAllowed(rows[0].userId)).toBe(true);

      expect(auth.revokeUserAccess).not.toHaveBeenCalled();
    });

    it('allows and warns when the directory is down', async () => {
      ldap.findUserById.mockRejectedValue(new Error('connect ECONNREFUSED'));

      expect(await service.isRefreshAllowed(rows[0].userId)).toBe(true);

      expect(auth.revokeUserAccess).not.toHaveBeenCalled();
      expect(logged('ldap-sync|refresh-check-skipped')[0][2]).toBe('warning');
    });

    it('allows a user without an ldap record', async () => {
      expect(await service.isRefreshAllowed('f'.repeat(24))).toBe(true);

      expect(ldap.findUserById).not.toHaveBeenCalled();
    });

    it('does not check anything when sync is disabled', async () => {
      ldapConfig.sync.isEnabled = false;

      expect(await service.isRefreshAllowed(rows[0].userId)).toBe(true);

      expect(userServices.findOne).not.toHaveBeenCalled();
    });

    it('refuses on a failure other than a directory error', async () => {
      userServices.findOne.mockRejectedValue(new Error('db down'));

      await expect(service.isRefreshAllowed(rows[0].userId)).rejects.toThrow('db down');
    });
  });
});
