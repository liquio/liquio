import crypto from 'crypto';

import { TestApp, config } from './test_app';

describe('Profile phone verification (ID-07)', () => {
  const CODE = '123456';
  const PHONE = '+380501110001';
  const OTHER_PHONE = '+380501110002';
  const ATTACKER_PHONE = '+380501110003';
  let app: TestApp;
  let victim: { userId: string; token: string };
  let attacker: { userId: string; token: string };

  async function createUser(ipn: string, extra: Record<string, any> = {}) {
    const user = await app
      .model('user')
      .create(
        { ipn, provider: 'local', email: `${ipn}@email.test`, isActive: true, valid: { email: false, phone: false }, ...extra },
        { returning: true },
      )
      .then((row) => row.dataValues);
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
      userId: user.userId,
      scope: ['userId', 'email', 'isActive'],
    } as any);
    return { userId: user.userId, token };
  }

  const getUser = (userId: string) =>
    app
      .model('user')
      .findOne({ where: { userId } })
      .then((row) => row!.dataValues);
  const codeRows = (where: Record<string, any>) =>
    app
      .model('confirmCode')
      .findAll({ where })
      .then((rows) => rows.map((r) => r.dataValues));
  const resetUser = (userId: string, phone: string | null = null) =>
    app.model('user').update({ phone: phone as any, valid: { email: false, phone: false } }, { where: { userId } });

  const send = (token: string, phone: unknown) => app.request().post('/user/info/phone/send').query({ access_token: token }).send({ phone });
  const confirm = (token: string, phone: unknown, code: unknown) =>
    app.request().post('/user/info/phone/confirm').query({ access_token: token }).send({ phone, code });
  const legacyVerify = (token: string, phone: string, code: string) =>
    app.request().post('/sign_up/confirmation/phone/verify').query({ access_token: token, phone, code });

  const expectUntouched = async (userId: string, phone: string | null = null) => {
    const user = await getUser(userId);
    expect(user.phone).toBe(phone);
    expect(user.valid?.phone).toBe(false);
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    (config as any).testConfirmations = { codes: [{ phones: [PHONE, OTHER_PHONE, ATTACKER_PHONE], confirmationCode: CODE }] };
    app = await TestApp.setup();
    victim = await createUser('#3000000001');
    attacker = await createUser('#3000000002');
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await resetUser(victim.userId);
    await resetUser(attacker.userId);
    await app.model('confirmCode').destroy({ where: {} });
  });

  describe('removed direct mutators', () => {
    it('GET /user/info/setValidPhone does not mark the phone verified', async () => {
      await app.request().get('/user/info/setValidPhone').query({ access_token: victim.token }).expect(410);
      await expectUntouched(victim.userId);
    });

    it('legacy /sign_in/requirements_phone_set endpoints do not mark an arbitrary phone verified', async () => {
      const agent = app.request();
      await agent.post('/sign_in/requirements_phone_set/confirm').send({ phone: ATTACKER_PHONE }).expect(410);
      await agent.get('/sign_in/requirements_phone_set').expect(410);
      await expectUntouched(victim.userId);
    });

    it.each([true, false])('POST /user/info cannot mark the phone verified (denyToUpdateUserValidParams=%s)', async (deny) => {
      const modules = ((config as any).modules ??= {});
      const previous = modules.denyToUpdateUserValidParams;
      modules.denyToUpdateUserValidParams = deny;
      try {
        for (const body of [
          { isValidPhone: 'true' },
          { phone: PHONE, isValidPhone: 'true' },
          { valid: { phone: 'true' } },
          { valid: { phone: true } },
        ]) {
          await app
            .request()
            .post('/user/info')
            .type('form')
            .send({ access_token: victim.token, ...body });
          expect((await getUser(victim.userId)).valid?.phone).toBe(false);
        }
      } finally {
        modules.denyToUpdateUserValidParams = previous;
      }
    });
  });

  describe('SMS challenge', () => {
    it('verifies once with a valid code bound to the user and exact phone, and a replay fails', async () => {
      await send(victim.token, PHONE).expect(200);
      expect((await codeRows({ phone: PHONE }))[0].userId).toBe(victim.userId);

      await confirm(victim.token, PHONE, CODE).expect(200);
      const user = await getUser(victim.userId);
      expect(user.phone).toBe(PHONE);
      expect(user.valid?.phone).toBe(true);
      expect(await codeRows({ phone: PHONE })).toHaveLength(0);

      await app.model('user').update({ phone: null as any, valid: { email: false, phone: false } }, { where: { userId: victim.userId } });
      await confirm(victim.token, PHONE, CODE).expect(400);
      await expectUntouched(victim.userId);
    });

    it('rejects concurrent redemption of one code: only one request succeeds', async () => {
      await send(victim.token, PHONE).expect(200);
      const results = await Promise.all([1, 2, 3, 4].map(() => confirm(victim.token, PHONE, CODE)));
      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    });

    it('rejects a missing code', async () => {
      await send(victim.token, PHONE).expect(200);
      await confirm(victim.token, PHONE, undefined).expect(400);
      await expectUntouched(victim.userId);
    });

    it('rejects a wrong code', async () => {
      await send(victim.token, PHONE).expect(200);
      await confirm(victim.token, PHONE, '000000').expect(400);
      await expectUntouched(victim.userId);
    });

    it('rejects malformed (non-string) codes', async () => {
      await send(victim.token, PHONE).expect(200);
      for (const code of [[CODE], { $ne: '' }, 123456, true, null, ['000000', CODE]]) {
        await confirm(victim.token, PHONE, code).expect(400);
        await expectUntouched(victim.userId);
      }
      await legacyVerify(victim.token, PHONE, CODE)
        .query({ code: [CODE, CODE] })
        .expect(400);
      await expectUntouched(victim.userId);
    });

    it('rejects a malformed phone', async () => {
      await send(victim.token, PHONE).expect(200);
      for (const phone of [[PHONE], { $ne: '' }, 380501110001, null, '']) {
        await confirm(victim.token, phone, CODE).expect(400);
        await expectUntouched(victim.userId);
      }
    });

    it('rejects an expired code', async () => {
      await app.model('confirmCode').create({ userId: victim.userId, phone: PHONE, code: CODE, counter: 0, expiresIn: new Date(Date.now() - 1000) });
      await confirm(victim.token, PHONE, CODE).expect(400);
      await expectUntouched(victim.userId);
    });

    it('rejects a code issued to another user', async () => {
      await send(attacker.token, PHONE).expect(200);
      await confirm(victim.token, PHONE, CODE).expect(400);
      await expectUntouched(victim.userId);
    });

    it('rejects a code issued without an account binding (unauthenticated send)', async () => {
      await app.request().get('/sign_up/confirmation/phone/send').query({ phone: PHONE }).expect(200);
      await confirm(victim.token, PHONE, CODE).expect(400);
      await legacyVerify(victim.token, PHONE, CODE).expect(200, { data: { isConfirmed: false } });
      await expectUntouched(victim.userId);
    });

    it('binds a code sent via the GET send route with an access token (task/back-core flow), usable once', async () => {
      await app.request().get('/sign_up/confirmation/phone/send').query({ phone: PHONE, access_token: victim.token }).expect(200);
      expect((await codeRows({ phone: PHONE }))[0].userId).toBe(victim.userId);

      await legacyVerify(attacker.token, PHONE, CODE).expect(200, { data: { isConfirmed: false } });
      await expectUntouched(victim.userId);

      await legacyVerify(victim.token, PHONE, CODE).expect(200);
      const user = await getUser(victim.userId);
      expect(user.phone).toBe(PHONE);
      expect(user.valid?.phone).toBe(true);
      await legacyVerify(victim.token, PHONE, CODE).expect(200, { data: { isConfirmed: false } });
    });

    it('does not bind a code sent with an invalid access token', async () => {
      await app.request().get('/sign_up/confirmation/phone/send').query({ phone: PHONE, access_token: 'invalid-token' }).expect(200);
      expect((await codeRows({ phone: PHONE }))[0].userId).toBeNull();
      await legacyVerify(victim.token, PHONE, CODE).expect(200, { data: { isConfirmed: false } });
      await expectUntouched(victim.userId);
    });

    it('rejects a code issued for another phone number', async () => {
      await send(victim.token, OTHER_PHONE).expect(200);
      await confirm(victim.token, PHONE, CODE).expect(400);
      await expectUntouched(victim.userId);
    });

    it('rejects a code after too many wrong attempts', async () => {
      await send(victim.token, PHONE).expect(200);
      for (let i = 0; i < 12; i++) await confirm(victim.token, PHONE, '000000').expect(400);
      await confirm(victim.token, PHONE, CODE).expect(400);
      await expectUntouched(victim.userId);
    });

    it('requires authentication', async () => {
      await app.request().post('/user/info/phone/confirm').send({ phone: PHONE, code: CODE }).expect(401);
      await app.request().post('/user/info/phone/send').send({ phone: PHONE }).expect(401);
    });

    it('legacy POST /sign_up/confirmation/phone/verify uses the same bound challenge', async () => {
      await send(attacker.token, PHONE).expect(200);
      await legacyVerify(victim.token, PHONE, CODE).expect(200, { data: { isConfirmed: false } });
      await expectUntouched(victim.userId);

      await send(victim.token, PHONE).expect(200);
      await legacyVerify(victim.token, PHONE, CODE).expect(200);
      expect((await getUser(victim.userId)).valid?.phone).toBe(true);
      await legacyVerify(victim.token, PHONE, CODE).expect(200, { data: { isConfirmed: false } });
    });

    it('does not change the account through the unauthenticated GET verify', async () => {
      await send(victim.token, PHONE).expect(200);
      await app.request().get('/sign_up/confirmation/phone/verify').query({ phone: PHONE, code: CODE });
      await expectUntouched(victim.userId);
    });
  });
});
