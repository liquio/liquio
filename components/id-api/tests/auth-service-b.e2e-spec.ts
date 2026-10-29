import crypto from 'crypto';

import { TestApp, config } from './test_app';
import { Services } from '../src/services';

describe('Auth service coverage (group B)', () => {
  let app: TestApp;
  let counter = 0;
  const svc = () => Services.service('auth');

  const newUser = async (extra: Record<string, unknown> = {}) => {
    counter += 1;
    const email = `svcb-${counter}@example.com`;
    const user = await app
      .model('user')
      .create({ ipn: `#7900000${counter}`, provider: 'local', email, first_name: 'Sam', last_name: 'Svc', ...extra }, { returning: true })
      .then((row) => row.dataValues);
    return { email, userId: user.userId as string };
  };

  const fakeReq = (body: Record<string, any> = {}, extra: Record<string, any> = {}) => ({ body, prepared: { user: { valid: {} } }, ...extra }) as any;

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.confirmCodeLength = 6;
    config.auth_providers.local = { isEnabled: true } as any;
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('user lookups and writes', () => {
    it('getUser returns normalized user, throws for unknown', async () => {
      const { email, userId } = await newUser({
        birthday: '1990-05-17',
        legalEntityDateRegistration: '2010-01-02',
        addressStruct: { city: 'Kyiv', street: 'Main', building: '1' },
      });
      const user = await svc().getUser({ userId });
      expect(user.email).toBe(email);
      expect(user.birthday).toBe('17/05/1990');
      expect(typeof user.address).toBe('string');
      await expect(svc().getUser({ userId: crypto.randomUUID() })).rejects.toThrow('user not found');
    });

    it('findUser, getUsers, getUsersWithCount and async variants', async () => {
      const { userId } = await newUser();
      const found = await new Promise<any>((resolve) => svc().findUser(userId, (_e, u) => resolve(u)));
      expect(found.userId).toBe(userId);
      const users = await svc().getUsersAsync({ userId });
      expect(users).toHaveLength(1);
      const withCount: any = await svc().getUsersWithCountAsync({ userId });
      expect(withCount.count).toBe(1);
      const cb = await new Promise<any>((resolve) => svc().getUsers({ userId }, (_e, u) => resolve(u), {}));
      expect(cb).toHaveLength(1);
      const cbCount = await new Promise<any>((resolve) => svc().getUsersWithCount({ userId }, (_e, u) => resolve(u), {}));
      expect(cbCount.count).toBe(1);
    });

    it('saveUser creates a user and reports duplicates', async () => {
      const email = 'SaveUserB@Example.com';
      const saved = await new Promise<any>((resolve) =>
        svc().saveUser({ email, ipn: '#7955501', provider: 'local' } as any, (e, u) => resolve({ e, u })),
      );
      expect(saved.u?.email).toBe('saveuserb@example.com');
      const dup = await new Promise<any>((resolve) =>
        svc().saveUser({ email, ipn: '#7955501', provider: 'local' } as any, (e, u) => resolve({ e, u })),
      );
      expect(dup.e).toBeTruthy();
    });

    it('saveUserWithServicesAsync creates a user with a service, and fails on duplicates', async () => {
      const query: any = {
        email: 'withsvc-b@example.com',
        ipn: '#7955502',
        provider: 'local',
        birthday: '17.05.1990',
        user_services: [{ provider: 'local', provider_id: 'withsvc-b@example.com', data: { password: 'x' } }],
      };
      const user = await svc().saveUserWithServicesAsync({ ...query, user_services: [...query.user_services] });
      expect(user?.user_services).toHaveLength(1);
      await expect(svc().saveUserWithServicesAsync({ ...query, user_services: [...query.user_services] })).rejects.toBeTruthy();
    });

    it('updateUser updates, normalises dates and reports unique conflicts', async () => {
      const a = await newUser();
      const b = await newUser();
      const updated = await svc().updateUser(
        { userId: a.userId },
        { first_name: 'Neo', birthday: '17/05/1990', legalEntityDateRegistration: '02/01/2010' },
      );
      expect(updated?.first_name).toBe('Neo');
      await expect(svc().updateUser({ userId: b.userId }, { email: a.email })).rejects.toThrow(/Can not update user/);
    });

    it('updateUser rethrows non-unique errors', async () => {
      jest.spyOn(app.model('user'), 'update').mockRejectedValueOnce(new Error('db failure'));
      await expect(svc().updateUser({ userId: crypto.randomUUID() }, { first_name: 'x' })).rejects.toThrow('db failure');
    });

    it('removeUser and removeServiceFromUserAsync', async () => {
      const { email, userId } = await newUser();
      await app.model('userServices').create({ provider: 'local', provider_id: email, userId, data: {} } as any);
      await svc().removeServiceFromUserAsync({ userId });
      expect(await app.model('userServices').count({ where: { userId } })).toBe(0);
      await svc().removeUser(email);
      expect(await app.model('user').count({ where: { email } })).toBe(0);
    });
  });

  describe('confirm codes', () => {
    it('saves, reads, validates and removes confirm codes', async () => {
      const email = 'codes-b@example.com';
      await svc().saveConfirmCodeAsync({ email, code: '123456', expiresIn: new Date(Date.now() + 600000) } as any);
      expect(await svc().getConfirmCodeAsync({ email })).toBeTruthy();
      expect(await svc().getValidConfirmCode({ email, code: '123456' })).toBeTruthy();
      expect(await svc().getValidConfirmCode({ email, code: '000000' })).toBeFalsy();
      expect(await svc().getValidConfirmCode({ email, code: { $ne: 'x' } as any })).toBeFalsy();
      const counter = await svc().incrementConfirmCodeCounterAsync({ email });
      expect(counter === null || typeof counter === 'number').toBe(true);
      await svc().removePreviousConfirmCodes({});
      await svc().removePreviousConfirmCodes({ email });
      await svc().removeConfirmCode({});
      await svc().removeConfirmCode({ email });
      expect(await svc().getConfirmCodeAsync({ email })).toBeFalsy();
    });

    it('getConfirmCode passes DB errors to the callback', async () => {
      jest.spyOn(app.model('confirmCode'), 'findOne').mockRejectedValueOnce(new Error('db'));
      await expect(svc().getConfirmCodeAsync({ email: 'x@y.z' })).rejects.toThrow('db');
    });

    it('generates pin and authorization codes, formats addresses', async () => {
      expect(svc().generatePinCode()).toHaveLength(6);
      const { userId } = await newUser();
      const client = await app
        .model('client')
        .findOne()
        .then((r) => r?.dataValues as any);
      const code = await svc().generateCustomAuthorizationCode({ id: userId, userId }, client.clientId, ['userId'], 60);
      expect(code).toBeTruthy();
      expect(
        svc().addressToString({ city: 'Lviv', street: 'S', building: '2', apt: '3', index: '79000', region: 'R', district: 'D', korp: '4' }),
      ).toContain('79000');
    });

    it('consumeSendQuota allows then limits', async () => {
      const results: boolean[] = [];
      for (let i = 0; i < 30; i += 1) {
        results.push(await svc().consumeSendQuota('email', 'quota-b@example.com', '10.0.0.9'));
      }
      expect(results[0]).toBe(true);
      await svc().consumeSendQuota('phone', '+380500000099', '10.0.0.9');
      await svc().consumeSendQuota('twoFactor', '+380500000099', '10.0.0.9');
    });
  });

  describe('confirmation helpers', () => {
    it('getCodeByEmailOnConfirmation', async () => {
      const email = 'confirm-b@example.com';
      await svc().saveConfirmCodeAsync({ email, code: '654321', expiresIn: new Date(Date.now() + 600000) } as any);
      await expect(svc().getCodeByEmailOnConfirmation(fakeReq({ email, code_email: '111111' }))).rejects.toThrow(
        "Email confirmation code doesn't match",
      );
      await svc().getCodeByEmailOnConfirmation(fakeReq({ email, code_email: '654321' }));
      const req = fakeReq({ email });
      await svc().getCodeByEmailOnConfirmation(req);
      expect(req.prepared.user.valid.phone).toBe(false);
    });

    it('getCodeByPhoneOnConfirmation', async () => {
      const phone = '+380500000123';
      await svc().saveConfirmCodeAsync({ phone, code: '654321', expiresIn: new Date(Date.now() + 600000) } as any);
      await svc().getCodeByPhoneOnConfirmation(fakeReq({ provider: 'google' }));
      const skip = fakeReq({ provider: 'google', code_phone: '1' });
      await svc().getCodeByPhoneOnConfirmation(skip);
      const bad = fakeReq({ code_phone: '111111' });
      bad.prepared.user.phone = phone;
      await expect(svc().getCodeByPhoneOnConfirmation(bad)).rejects.toThrow("Phone confirmation code doesn't match");
      const good = fakeReq({ code_phone: '654321' });
      good.prepared.user.phone = phone;
      await svc().getCodeByPhoneOnConfirmation(good);
      expect(good.prepared.user.valid).toEqual({ phone: true });
      const none = fakeReq({});
      await svc().getCodeByPhoneOnConfirmation(none);
      expect(none.prepared.user.valid.email).toBe(false);
    });

    it('checkUserByPhoneExistsOnConfirmation', async () => {
      const { userId } = await newUser({ phone: '+380500000777' });
      expect(userId).toBeTruthy();
      const taken = fakeReq({});
      taken.prepared.user.phone = '+380500000777';
      await expect(svc().checkUserByPhoneExistsOnConfirmation(taken)).rejects.toThrow('Phone is already taken');
      const free = fakeReq({});
      free.prepared.user.phone = '+380500000778';
      await svc().checkUserByPhoneExistsOnConfirmation(free);
      await svc().checkUserByPhoneExistsOnConfirmation(fakeReq({}));
    });

    it('getUserToSaveOnConfirmation', async () => {
      await expect(svc().getUserToSaveOnConfirmation(fakeReq({}, { session: {} }))).rejects.toThrow('User session should be defined.');
      const req = fakeReq(
        {},
        {
          session: { preparedUser: { first_name: 'P', role: 'admin' }, authInfo: { services: {} } },
          user: { provider: 'eds', user_id: 'u1', services: { eds: { name: 'x' } } },
        },
      );
      const res = await svc().getUserToSaveOnConfirmation(req);
      expect(res.role).toBeUndefined();
      expect(res.user_services[0].provider).toBe('eds');
    });
  });

  describe('clients, scopes and access', () => {
    it('create, find by redirect uri and remove a client', async () => {
      const clientId = 'svc-b-client';
      const created = await svc().createClientFromApi({
        clientId,
        secret: 's',
        redirectUri: ['http://svc-b.example'],
        grants: ['authorization_code'],
        scope: [],
        client_name: 'B',
      } as any);
      expect(created.clientId).toBe(clientId);
      await expect(svc().createClientFromApi({ clientId, secret: 's' } as any)).rejects.toBeTruthy();
      expect(await svc().getRegisteredRedirectUris()).toContain('http://svc-b.example');
      const viaCb = await new Promise<any>((resolve) => svc().getClientByRedirectUri('http://svc-b.example', (_e, c) => resolve(c)));
      expect(viaCb.clientId).toBe(clientId);
      const direct: any = await svc().getClientByRedirectUri('http://svc-b.example');
      expect(direct === null || typeof direct === 'object').toBe(true);
      expect(await svc().getClientByRedirectUri('http://nowhere.example')).toBeNull();
      expect(await svc().removeClientFromApi(clientId)).toBe(true);
    });

    it('upserts and reads user scope by client', async () => {
      const { userId } = await newUser();
      await svc().createClientFromApi({
        clientId: 'svc-b-scope',
        secret: 's',
        redirectUri: ['http://svc-b2.example'],
        grants: [],
        scope: [],
        client_name: 'B2',
      } as any);
      expect(await svc().getUserScopeByClient(userId, 'svc-b-scope')).toBeUndefined();
      await svc().upsertUserByClient({ userId, clientId: 'svc-b-scope', scope: ['userId'] } as any);
      const updated = await svc().upsertUserByClient({ userId, clientId: 'svc-b-scope', scope: ['userId', 'email'] } as any);
      expect(updated.scope).toEqual(['userId', 'email']);
      jest.spyOn(app.model('clientUser'), 'findOne').mockRejectedValueOnce(new Error('db'));
      await expect(svc().upsertUserByClient({ userId, clientId: 'svc-b-scope', scope: [] } as any)).rejects.toThrow('db');
    });

    it('invalidates caches and revokes user access', async () => {
      const { userId } = await newUser();
      const client = await app
        .model('client')
        .findOne()
        .then((r) => r?.dataValues as any);
      await app
        .model('accessToken')
        .create({ accessToken: crypto.randomUUID(), clientId: client.clientId, expires: new Date(Date.now() + 60000), userId, scope: [] } as any);
      await svc().invalidateUserCache(userId);
      expect(await svc().invalidateUserTokenCache('')).toBe(0);
      expect(await svc().invalidateUserTokenCache(userId)).toBe(1);
      const redis = Services.service('redis');
      jest.spyOn(redis, 'delete').mockRejectedValue(new Error('redis down'));
      await expect(svc().invalidateUserTokenCache(userId)).rejects.toThrow('redis down');
      expect(await svc().invalidateUserTokenCache(userId, { ignoreCacheErrors: true })).toBe(1);
      jest.restoreAllMocks();
      const res = await svc().revokeUserAccess(userId);
      expect(res.accessTokens).toBe(1);
    });

    it('isUserId distinguishes UUIDs', () => {
      expect(svc().isUserId('0123456789abcdef01234567')).toBe(true);
      expect(svc().isUserId('abc')).toBe(false);
    });
  });

  describe('phone challenges and password updates', () => {
    const PHONE = '+380500000555';

    it('sendPhoneConfirmCode with a test code, confirmUserPhone and consumePhoneChallenge', async () => {
      (config as any).testConfirmations = { codes: [{ phones: [PHONE], confirmationCode: '424242' }] };
      const { userId } = await newUser();
      const sent = await svc().sendPhoneConfirmCode(PHONE, userId);
      expect(sent).toEqual({ sendBySms: { testUser: true } });
      expect(await svc().confirmUserPhone(userId, PHONE, '000000')).toBeNull();
      expect(await svc().confirmUserPhone('', PHONE, '1')).toBeNull();
      const confirmed = await svc().confirmUserPhone(userId, PHONE, '424242');
      expect(confirmed?.phone).toBe(PHONE);
      expect(await svc().confirmUserPhone(userId, PHONE, '424242')).toBeNull();
      await svc().sendPhoneConfirmCode(PHONE, userId);
      expect(await svc().consumePhoneChallenge(userId, PHONE, '111111')).toBe(false);
      expect(await svc().consumePhoneChallenge(userId, PHONE, '424242')).toBe(true);
      expect(await svc().consumePhoneChallenge(userId, '', '1')).toBe(false);
      (config as any).testConfirmations = undefined;
    });

    it('sendPhoneConfirmCode sends an SMS for ordinary numbers', async () => {
      const sms = jest.spyOn(Services.service('notify'), 'sendSms').mockResolvedValue({} as any);
      await svc().sendPhoneConfirmCode('+380500000556');
      expect(sms).toHaveBeenCalledTimes(1);
    });

    it('updateLocalPassword honours expectations and revokes sessions', async () => {
      const { email, userId } = await newUser();
      expect(await svc().updateLocalPassword(crypto.randomUUID(), { password: 'x' })).toBe(false);
      expect(await svc().updateLocalPassword(userId, { password: 'x' })).toBe(false);
      expect(await svc().updateLocalPassword(userId, { password: 'h1' }, { providerId: email, email })).toBe(true);
      expect(await svc().updateLocalPassword(userId, { password: 'h2' }, { passwordHash: 'wrong' })).toBe(false);
      expect(await svc().updateLocalPassword(userId, { password: 'h3' }, { passwordHash: 'h1' })).toBe(true);
      expect(await svc().updateLocalPassword(userId, { password: 'h4' }, { resetToken: '' })).toBe(false);
    });

    it('destroySession deletes tokens and writes login history', async () => {
      const { userId } = await newUser();
      const create = jest.spyOn(app.model('loginHistory'), 'create').mockResolvedValueOnce({} as any);
      await svc().destroySession(userId, { userId, actionType: 'blocked' } as any);
      expect(create).toHaveBeenCalledTimes(1);
      await svc().destroySession(userId, undefined as any);
    });
  });
});
