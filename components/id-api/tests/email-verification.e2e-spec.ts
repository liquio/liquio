import crypto from 'crypto';

import { TestApp, config } from './test_app';

describe('Profile email verification (ID-08)', () => {
  const CODE = '123456';
  const NEW_EMAIL = 'new-email-id08@email.test';
  const OTHER_EMAIL = 'other-email-id08@email.test';
  let app: TestApp;
  let victim: { userId: string; token: string; email: string };

  async function createUser(ipn: string) {
    const email = `${ipn.replace('#', '')}@email.test`;
    const user = await app
      .model('user')
      .create({ ipn, provider: 'local', email, isActive: true, valid: { email: true, phone: false } }, { returning: true })
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
      scope: ['userId', 'email', 'isActive', 'profile:write'],
    } as any);
    return { userId: user.userId, token, email };
  }

  const getUser = (userId: string) =>
    app
      .model('user')
      .findOne({ where: { userId } })
      .then((row) => row!.dataValues);
  const resetUser = () =>
    app.model('user').update({ email: victim.email, valid: { email: true, phone: false } }, { where: { userId: victim.userId } });
  const updateInfo = (body: Record<string, unknown>) =>
    app
      .request()
      .post('/user/info')
      .type('form')
      .send({ access_token: victim.token, ...body });
  const sendCode = (email: string) => app.request().get('/user/info/email/send').query({ access_token: victim.token, email });
  const setEmail = (email: string, code: string) =>
    app.request().get('/user/info/email/set').query({ access_token: victim.token, email, code_email: code });

  const expectUntouched = async () => {
    const user = await getUser(victim.userId);
    expect(user.email).toBe(victim.email);
    expect(user.valid?.email).toBe(true);
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    (config as any).testConfirmations = { codes: [{ emails: [NEW_EMAIL, OTHER_EMAIL], confirmationCode: CODE }] };
    app = await TestApp.setup();
    victim = await createUser('#3100000001');
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await resetUser();
    await app.model('confirmCode').destroy({ where: {} });
  });

  describe('generic profile update', () => {
    it('POST /user/info rejects an email change and leaves email and validity untouched', async () => {
      await updateInfo({ email: NEW_EMAIL }).expect(400);
      await expectUntouched();
    });

    it('POST /user/info rejects an email change that also claims the new email is verified', async () => {
      await updateInfo({ email: NEW_EMAIL, isValidEmail: 'true' }).expect(400);
      await updateInfo({ email: NEW_EMAIL, 'valid[email]': 'true' }).expect(400);
      await expectUntouched();
    });

    it.each([true, false])('POST /user/info cannot mark the email verified (denyToUpdateUserValidParams=%s)', async (deny) => {
      const modules = ((config as any).modules ??= {});
      const previous = modules.denyToUpdateUserValidParams;
      modules.denyToUpdateUserValidParams = deny;
      try {
        await app.model('user').update({ valid: { email: false, phone: false } }, { where: { userId: victim.userId } });
        for (const body of [{ isValidEmail: 'true' }, { 'valid[email]': 'true' }]) {
          await updateInfo(body);
          expect((await getUser(victim.userId)).valid?.email).toBe(false);
        }
      } finally {
        modules.denyToUpdateUserValidParams = previous;
      }
    });

    it('POST /user/info keeps unrelated profile updates working', async () => {
      await updateInfo({ gender: 'male' }).expect(200);
      const user = await getUser(victim.userId);
      expect(user.gender).toBe('male');
      expect(user.email).toBe(victim.email);
      expect(user.valid?.email).toBe(true);
    });
  });

  describe('confirmation-code flow', () => {
    it('changes the email and marks it verified with a valid code, and a replay fails', async () => {
      await sendCode(NEW_EMAIL).expect(200);
      await setEmail(NEW_EMAIL, CODE).expect(200);
      const user = await getUser(victim.userId);
      expect(user.email).toBe(NEW_EMAIL);
      expect(user.valid?.email).toBe(true);

      await app.model('user').update({ email: victim.email, valid: { email: false, phone: false } }, { where: { userId: victim.userId } });
      await setEmail(NEW_EMAIL, CODE).expect(400);
      const after = await getUser(victim.userId);
      expect(after.email).toBe(victim.email);
      expect(after.valid?.email).toBe(false);
    });

    it('rejects a wrong code', async () => {
      await sendCode(NEW_EMAIL).expect(200);
      await setEmail(NEW_EMAIL, '000000').expect(400);
      await expectUntouched();
    });

    it('rejects a code issued for a different email', async () => {
      await sendCode(OTHER_EMAIL).expect(200);
      await setEmail(NEW_EMAIL, CODE).expect(400);
      await expectUntouched();
    });

    it('rejects an expired code', async () => {
      await sendCode(NEW_EMAIL).expect(200);
      await app.model('confirmCode').update({ expiresIn: new Date(Date.now() - 1000) } as any, { where: { email: NEW_EMAIL } });
      await setEmail(NEW_EMAIL, CODE).expect(400);
      await expectUntouched();
    });
  });
});
