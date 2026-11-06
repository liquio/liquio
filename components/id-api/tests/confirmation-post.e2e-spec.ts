import crypto from 'crypto';

import { TestApp, config } from './test_app';

describe('Confirmation codes travel in the POST body, GET is deprecated (SE-3930 IF-05)', () => {
  const CODE = '123456';
  const EMAIL = 'post-codes-if05@email.test';
  const NEW_EMAIL = 'post-codes-if05-new@email.test';
  const PHONE = '+380507770001';
  let app: TestApp;
  let user: { userId: string; token: string; email: string };

  const confirmRow = (where: Record<string, any>) =>
    app
      .model('confirmCode')
      .findOne({ where })
      .then((row) => row?.dataValues as any);

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    (config as any).testConfirmations = { codes: [{ emails: [EMAIL, NEW_EMAIL], phones: [PHONE], confirmationCode: CODE }] };
    app = await TestApp.setup();

    const created = await app
      .model('user')
      .create(
        { ipn: '#3100000501', provider: 'local', email: 'if05-owner@email.test', isActive: true, valid: { email: true, phone: false } },
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
      userId: created.userId,
      scope: ['userId', 'email', 'isActive', 'profile:write'],
    } as any);
    user = { userId: created.userId, token, email: 'if05-owner@email.test' };
  });

  afterAll(async () => {
    delete (config as any).legacyGetConfirmation;
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    delete (config as any).legacyGetConfirmation;
    await app.model('confirmCode').destroy({ where: {} });
  });

  describe('sign-up email', () => {
    it('POST send stores a code and POST verify accepts it from the body', async () => {
      await app.request().post('/sign_up/confirmation/email/send').send({ email: EMAIL }).expect(200);
      expect((await confirmRow({ email: EMAIL }))?.code).toBe(CODE);

      const res = await app.request().post('/sign_up/confirmation/email/verify').send({ email: EMAIL, code: CODE }).expect(200);
      expect(res.text).toBe('confirm');
    });

    it('POST verify with a wrong code answers null and increments the attempt counter', async () => {
      await app.request().post('/sign_up/confirmation/email/send').send({ email: EMAIL }).expect(200);

      const res = await app.request().post('/sign_up/confirmation/email/verify').send({ email: EMAIL, code: '000000' }).expect(200);
      expect(res.text).toBe('null');
      expect((await confirmRow({ email: EMAIL })).counter).toBe(1);
    });

    it('POST rejects a missing or non-string value', async () => {
      await app.request().post('/sign_up/confirmation/email/send').send({}).expect(400);
      await app
        .request()
        .post('/sign_up/confirmation/email/verify')
        .send({ email: EMAIL, code: { $ne: '' } })
        .expect(400);
      await app.request().post('/sign_up/confirmation/email/verify').send({ email: EMAIL }).expect(400);
    });

    it('POST ignores values placed in the query string', async () => {
      await app.request().post('/sign_up/confirmation/email/send').query({ email: EMAIL }).expect(400);
    });
  });

  describe('sign-up phone', () => {
    it('POST check_code verifies from the body without authorisation, counting wrong attempts', async () => {
      await app.model('confirmCode').create({ phone: PHONE, code: CODE, counter: 0, expiresIn: new Date(Date.now() + 60_000) } as any);

      expect((await app.request().post('/sign_up/confirmation/phone/check_code').send({ phone: PHONE, code: '000000' }).expect(200)).text).toBe(
        'null',
      );
      expect((await confirmRow({ phone: PHONE })).counter).toBe(1);
      expect((await app.request().post('/sign_up/confirmation/phone/check_code').send({ phone: PHONE, code: CODE }).expect(200)).text).toBe(
        'confirm',
      );
    });

    it('POST /phone/verify (authorised) takes phone and code from the body', async () => {
      await app.request().post('/sign_up/confirmation/phone/verify').send({ phone: PHONE }).expect(400);
      await app.request().post('/sign_up/confirmation/phone/verify').send({ phone: PHONE, code: CODE }).expect(401);
    });
  });

  describe('profile email change', () => {
    const bearer = () => ({ Authorization: `Bearer ${user.token}` });

    it('POST /user/info/email/send and /email/set work with the values in the body', async () => {
      await app.request().post('/user/info/email/send').send({ email: NEW_EMAIL }).expect(200);
      expect((await confirmRow({ email: NEW_EMAIL }))?.code).toBe(CODE);

      await app.request().post('/user/info/email/set').set(bearer()).send({ email: NEW_EMAIL, code_email: '000000' }).expect(400);
      expect((await confirmRow({ email: NEW_EMAIL })).counter).toBe(1);

      await app.request().post('/user/info/email/set').set(bearer()).send({ email: NEW_EMAIL, code_email: CODE }).expect(200);
      expect(await confirmRow({ email: NEW_EMAIL })).toBeFalsy();
    });

    it('POST check_email_confirmation_code consumes the code and POST check_phone_confirmation_code validates the body', async () => {
      await app.request().post('/user/info/email/send').send({ email: NEW_EMAIL }).expect(200);
      const res = await app
        .request()
        .post('/user/info/email/check_email_confirmation_code')
        .set(bearer())
        .send({ email: NEW_EMAIL, code_email: CODE })
        .expect(200);
      expect(res.body).toEqual({ isCodeConfirmed: true });
      expect(await confirmRow({ email: NEW_EMAIL })).toBeFalsy();

      await app.request().post('/user/info/phone/check_phone_confirmation_code').set(bearer()).send({ phone: PHONE }).expect(400);
      await app.request().post('/user/info/phone/check_phone_confirmation_code').set(bearer()).send({ phone: PHONE, code_phone: CODE }).expect(400);
    });

    it('POST /removeConfirmCode removes the code given in the body', async () => {
      await app.model('confirmCode').create({ email: NEW_EMAIL, code: CODE, counter: 0, expiresIn: new Date(Date.now() + 60_000) } as any);
      await app.request().post('/removeConfirmCode').set(bearer()).send({ code: CODE }).expect(200);
      expect(await confirmRow({ email: NEW_EMAIL })).toBeFalsy();
    });
  });

  describe('legacyGetConfirmation flag', () => {
    it('keeps the GET variants working by default', async () => {
      await app.request().get('/sign_up/confirmation/email/send').query({ email: EMAIL }).expect(200);
      expect((await app.request().get('/sign_up/confirmation/email/verify').query({ email: EMAIL, code: CODE }).expect(200)).text).toBe('confirm');
    });

    it('answers 410 for every GET variant when disabled, while POST keeps working', async () => {
      (config as any).legacyGetConfirmation = false;
      const bearer = { Authorization: `Bearer ${user.token}` };

      await app.request().get('/sign_up/confirmation/email/send').query({ email: EMAIL }).expect(410);
      await app.request().get('/sign_up/confirmation/email/verify').query({ email: EMAIL, code: CODE }).expect(410);
      await app.request().get('/sign_up/confirmation/phone/send').query({ phone: PHONE }).expect(410);
      await app.request().get('/sign_up/confirmation/phone/verify').query({ phone: PHONE, code: CODE }).expect(410);
      await app.request().get('/user/info/email/send').query({ email: NEW_EMAIL }).expect(410);
      await app.request().get('/user/info/email/set').set(bearer).query({ email: NEW_EMAIL, code_email: CODE }).expect(410);
      await app.request().get('/user/info/email/check_email_confirmation_code').set(bearer).query({ email: NEW_EMAIL, code_email: CODE }).expect(410);
      await app.request().get('/user/info/phone/check_phone_confirmation_code').set(bearer).query({ phone: PHONE, code_phone: CODE }).expect(410);
      await app.request().get('/removeConfirmCode').set(bearer).query({ code: CODE }).expect(410);
      expect(await confirmRow({ email: EMAIL })).toBeFalsy();

      await app.request().post('/sign_up/confirmation/email/send').send({ email: EMAIL }).expect(200);
      expect((await app.request().post('/sign_up/confirmation/email/verify').send({ email: EMAIL, code: CODE }).expect(200)).text).toBe('confirm');
    });

    it('rejects codes in the query of POST /phone/verify when disabled', async () => {
      (config as any).legacyGetConfirmation = false;
      await app.request().post('/sign_up/confirmation/phone/verify').query({ phone: PHONE, code: CODE }).expect(410);
    });
  });
});
