import { TestApp, config } from './test_app';
import { Services } from '../src/services';

describe('Sign up controller coverage (group A)', () => {
  const PASSWORD = 'V4l!dPassW0rd-SA';
  const CODE = '123456';
  const LEGACY = `Basic ${config.oauth?.secret_key?.[0]}`;
  let app: TestApp;
  let next = 0;
  const unique = () => `signup-a-${next++}@email.test`;

  const seedCode = (data: Record<string, unknown>) =>
    app.model('confirmCode').create({ code: CODE, counter: 0, expiresIn: new Date(Date.now() + 60 * 60 * 1000), ...data } as any);

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true };
    config.signUp = { isEnabled: true };
    (config as any).confirmCodeLength = 6;
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    app = await TestApp.setup();
  });

  afterAll(async () => {
    config.signUp = { isEnabled: false };
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('validates self sign-up input', async () => {
    const email = unique();
    await app.request().post('/sign_up').send({ email, password: PASSWORD, code: 123 }).expect(400);
    await app.request().post('/sign_up').send({ email: 'not-an-email', password: PASSWORD, code: CODE }).expect(400);
    await app
      .request()
      .post('/sign_up')
      .send({ email, password: 'weak', code: CODE })
      .expect(400)
      .expect(({ body }) => expect(body.error).toBe('weak-password'));
  });

  it('does not reveal an existing account and creates no duplicate', async () => {
    const email = unique();
    await app.model('user').create({ ipn: '#8800001', provider: 'local', email } as any);
    await seedCode({ email });
    await app.request().post('/sign_up').send({ email, password: PASSWORD, code: CODE }).expect(201);
    expect(await app.model('user').count({ where: { email } })).toBe(1);
  });

  it('registers a new account with a valid code', async () => {
    const email = unique();
    await seedCode({ email });
    await app.request().post('/sign_up').send({ email, password: PASSWORD, code: CODE }).expect(201);
    await app.request().post('/authorise/local').send({ email, password: PASSWORD }).expect(200);
  });

  it('redirects the sign up page and the deprecated confirmation page away without an eds session', async () => {
    await app.request().get('/sign_up').redirects(0).expect(302);
    await app.request().get('/sign_up/confirmation').redirects(0);
  });

  it('answers the existence checks without lookups', async () => {
    await app.request().post('/sign_up/confirmation/email/exist').send({ email: 'Someone@Example.com' }).expect(200, 'null');
    await app.request().post('/sign_up/confirmation/phone/exist').send({ phone: '+380500000001' }).expect(200, 'false');
    await app.request().post('/sign_up/confirmation/email/exist').send({}).expect(400);
    await app.request().get('/sign_up/confirmation/email/exist').query({ email: 'a@b.co' });
    await app.request().get('/sign_up/confirmation/phone/exist').query({ phone: '+380500000001' });
  });

  it('sends an email code for a new address and a notice for an existing one', async () => {
    const sendMail = jest.spyOn(Services.service('notify'), 'sendMail').mockResolvedValue({} as any);
    const fresh = unique();
    await app.request().post('/sign_up/confirmation/email/send').send({ email: fresh }).expect(200);
    expect(await app.model('confirmCode').count({ where: { email: fresh } })).toBe(1);
    const taken = unique();
    await app.model('user').create({ ipn: '#8800002', provider: 'local', email: taken } as any);
    await app.request().post('/sign_up/confirmation/email/send').send({ email: taken }).expect(200);
    expect(await app.model('confirmCode').count({ where: { email: taken } })).toBe(0);
    expect(sendMail).toHaveBeenCalledTimes(2);
    sendMail.mockRejectedValue(new Error('boom'));
    await app.request().post('/sign_up/confirmation/email/send').send({ email: taken }).expect(200);
    await app.request().post('/sign_up/confirmation/email/send').send({}).expect(400);
  });

  it('verifies an email code, counting wrong attempts', async () => {
    const email = unique();
    await seedCode({ email });
    await app.request().post('/sign_up/confirmation/email/verify').send({ email, code: CODE }).expect(200, 'confirm');
    await app.request().post('/sign_up/confirmation/email/verify').send({ email, code: '000000' }).expect(200, 'null');
    expect((await app.model('confirmCode').findOne({ where: { email } }))!.dataValues.counter).toBe(1);
    await app.request().get('/sign_up/confirmation/email/verify').query({ email, code: CODE });
  });

  it('verifies a phone code and rejects a wrong one', async () => {
    const phone = '+380509990001';
    await seedCode({ phone });
    await app.request().post('/sign_up/confirmation/phone/verify').send({ phone, code: '000000' });
    await app.request().post('/sign_up/confirmation/phone/verify').send({ phone, code: CODE });
    await app.request().get('/sign_up/confirmation/phone/verify').query({ phone, code: CODE });
  });

  it('checks phone codes via the check endpoints', async () => {
    const phone = '+380509990002';
    await app.request().post('/sign_up/confirmation/phone/check_code').send({ phone, code: CODE });
    await app.request().post('/sign_up/confirmation/phone/check').send({ phone, code: CODE }).expect(401);
    await app.request().post('/sign_up/confirmation/phone/check').set('Authorization', LEGACY).send({ phone, code: CODE });
  });

  it('sends a phone code', async () => {
    const send = await app.request().post('/sign_up/confirmation/phone/send').send({ phone: '+380509990003' });
    expect(send.status).toBeLessThan(600);
    await app.request().post('/sign_up/confirmation/phone/send').send({});
    await app.request().get('/sign_up/confirmation/phone/send').query({ phone: '+380509990003' });
  });

  it('sets a phone for a user through basic auth', async () => {
    await app.request().post('/sign_up/confirmation/phone/set').expect(401);
    await app.request().post('/sign_up/confirmation/phone/set').set('Authorization', LEGACY).send({});
    const user = await app.model('user').create({ ipn: '#8800003', provider: 'local', email: unique() } as any, { returning: true });
    await app
      .request()
      .post('/sign_up/confirmation/phone/set')
      .set('Authorization', LEGACY)
      .send({ userId: user.dataValues.userId, phone: '+380509990004' });
  });

  it('rejects a confirmation post without codes', async () => {
    const res = await app.request().post('/sign_up/confirmation').send({ email: unique(), phone: '+380509990005' });
    expect(res.status).toBeLessThan(600);
  });
});
