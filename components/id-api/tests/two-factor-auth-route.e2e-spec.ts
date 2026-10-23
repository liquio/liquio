import crypto from 'crypto';

import { TestApp, config } from './test_app';

describe('POST /user/two_factor_auth (ID-09d)', () => {
  const CODE = '123456';
  const PHONE = '+380501110077';
  let app: TestApp;
  let victim: { userId: string; token: string };
  let readOnly: string;

  const createToken = async (userId: string, scope: string[]) => {
    const client = await app
      .model('client')
      .findOne()
      .then((row) => row?.dataValues as any);
    const random = crypto.randomUUID();
    const token = `${random.slice(0, 14)}1${random.slice(15)}`;
    await app.model('accessToken').create({
      accessToken: token,
      clientId: client.clientId,
      expires: new Date(Date.now() + 60 * 60 * 1000),
      userId,
      scope,
    } as any);
    return token;
  };
  const getUser = (userId: string) =>
    app
      .model('user')
      .findOne({ where: { userId } })
      .then((row) => row!.dataValues);
  const setUser = (values: Record<string, any>) => app.model('user').update(values as any, { where: { userId: victim.userId } });
  const call = (body: Record<string, unknown>, token = victim.token) =>
    app.request().post('/user/two_factor_auth').query({ access_token: token }).send(body);
  const sendSms = () => app.request().post('/user/info/phone/send').query({ access_token: victim.token }).send({ phone: PHONE });
  const actions = () =>
    app
      .model('userAdminAction')
      .findAll({ where: { user_id: victim.userId } })
      .then((rows) => rows.map((row) => row.dataValues));

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    (config as any).testConfirmations = { codes: [{ phones: [PHONE], confirmationCode: CODE }] };
    app = await TestApp.setup();
    const user = await app
      .model('user')
      .create({ ipn: '#3300000001', provider: 'local', email: 'id09d@email.test', isActive: true } as any, { returning: true })
      .then((row) => row.dataValues);
    victim = { userId: user.userId, token: await createToken(user.userId, ['userId', 'email', 'isActive', 'profile:write']) };
    readOnly = await createToken(user.userId, ['userId', 'email']);
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await setUser({ phone: PHONE, valid: { email: false, phone: true }, useTwoFactorAuth: false, twoFactorType: null });
    await app.model('confirmCode').destroy({ where: {} });
  });

  it('refuses enabling for an unverified phone', async () => {
    await setUser({ valid: { email: false, phone: false } });
    await call({ useTwoFactorAuth: true }).expect(400);
    expect((await getUser(victim.userId)).useTwoFactorAuth).toBe(false);
  });

  it('refuses a token without write scope', async () => {
    await call({ useTwoFactorAuth: true }, readOnly).expect(403);
    expect((await getUser(victim.userId)).useTwoFactorAuth).toBe(false);
  });

  it('enables phone 2FA for a verified phone and writes an audit row', async () => {
    await call({ useTwoFactorAuth: true }).expect(200);
    const user = await getUser(victim.userId);
    expect(user.useTwoFactorAuth).toBe(true);
    expect(user.twoFactorType).toBe('phone');
    expect((await actions()).some((row) => (row.data as any).changes?.twoFactor === 'phone enabled')).toBe(true);
  });

  it('refuses TOTP through this route', async () => {
    await call({ useTwoFactorAuth: true, twoFactorType: 'totp' }).expect(400);
    expect((await getUser(victim.userId)).useTwoFactorAuth).toBe(false);
  });

  it('refuses changing 2FA while TOTP is active', async () => {
    await setUser({ useTwoFactorAuth: true, twoFactorType: 'totp' });
    await call({ useTwoFactorAuth: false, code: CODE }).expect(400);
    expect((await getUser(victim.userId)).useTwoFactorAuth).toBe(true);
  });

  describe('disabling phone 2FA', () => {
    beforeEach(() => setUser({ useTwoFactorAuth: true, twoFactorType: 'phone' }));

    it('needs a code', async () => {
      await call({ useTwoFactorAuth: false }).expect(400);
      expect((await getUser(victim.userId)).useTwoFactorAuth).toBe(true);
    });

    it('refuses a wrong code and a code that was never sent', async () => {
      await call({ useTwoFactorAuth: false, code: CODE }).expect(400);
      await sendSms().expect(200);
      await call({ useTwoFactorAuth: false, code: '000000' }).expect(400);
      expect((await getUser(victim.userId)).useTwoFactorAuth).toBe(true);
    });

    it('disables with a fresh SMS code, once, and audits it', async () => {
      await sendSms().expect(200);
      await call({ useTwoFactorAuth: false, code: CODE }).expect(200);
      expect((await getUser(victim.userId)).useTwoFactorAuth).toBe(false);
      expect((await actions()).some((row) => (row.data as any).changes?.twoFactor === 'phone disabled')).toBe(true);

      await setUser({ useTwoFactorAuth: true, twoFactorType: 'phone' });
      await call({ useTwoFactorAuth: false, code: CODE }).expect(400);
      expect((await getUser(victim.userId)).useTwoFactorAuth).toBe(true);
    });
  });
});
