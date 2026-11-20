import bcrypt from 'bcrypt';
import supertest from 'supertest';

import { TestApp, config } from './test_app';
import { Services } from '../src/services';

describe('Confirmation code input type (KS-22)', () => {
  const password = 'V4l!dPassW0rd';
  const email = 'confirm-code-input@email.test';
  const phone = '+380501112299';
  const code = '654321';
  const REGISTERED_URI = 'http://test-client-site';
  let app: TestApp;

  const newAgent = () => supertest.agent(`http://localhost:${config.port}`);

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true };
    app = await TestApp.setup();
    const user = await app
      .model('user')
      .create({ ipn: '#3000000001', provider: 'local', email, phone, useTwoFactorAuth: true, twoFactorType: 'phone' }, { returning: true })
      .then((row) => row.dataValues);
    await app.model('userServices').create({
      provider: 'local',
      provider_id: email,
      userId: user.userId,
      data: { password: bcrypt.hashSync(password, 1).toString(), oldPasswords: [], isChangeRequired: true },
    });
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await app.model('confirmCode').destroy({ where: {} });
    await app.model('confirmCode').create({ phone, email, code, counter: 0, expiresIn: new Date(Date.now() + 600000) } as any);
  });

  async function startFlow(): Promise<supertest.Agent> {
    const agent = newAgent();
    await agent.post('/authorise/local').send({ email, password }).expect(200);
    await agent
      .get('/authorise')
      .query({ client_id: 'liquio-portal', state: 'st', redirect_uri: REGISTERED_URI, response_type: 'code' })
      .redirects(0)
      .expect(302);
    return agent;
  }

  const expectNoCode = (response: supertest.Response) => {
    expect(response.status).toBe(302);
    expect(response.headers.location).not.toContain('code=');
  };

  it.each([
    ['array', [code, '000000', '999999']],
    ['object', { not: code }],
  ])('rejects an %s code for the phone second factor', async (_name, value) => {
    const agent = await startFlow();

    await agent.post('/sign_up/confirmation/phone/check').send({ code: value }).expect(400);

    expectNoCode(await agent.get('/authorise/continue').redirects(0));
    expect(await app.model('confirmCode').count({ where: { phone } })).toBe(1);
  });

  it('still accepts the valid string code for the phone second factor', async () => {
    const agent = await startFlow();

    await agent.post('/sign_up/confirmation/phone/check').send({ code }).expect(200, { success: true });
  });

  it.each([
    ['code_email', { email, code_email: ['000000', code] }],
    ['code_phone', { phone, code_phone: ['000000', code] }],
    ['phone', { phone: [phone, '+380509999999'], code_phone: code }],
    ['email', { email: [email], code_email: code }],
  ])('rejects a non-string %s on sign up confirmation', async (_field, body) => {
    await newAgent().post('/sign_up/confirmation').send(body).expect(400);
  });

  it('does not match codes by a non-string value in the service', async () => {
    const auth = Services.service('auth');

    expect(await auth.getValidConfirmCode({ email, code: ['000000', code] })).toBeUndefined();
    expect(await auth.getValidConfirmCode({ email: [email, 'other@email.test'], code })).toBeUndefined();
    expect(await auth.getValidConfirmCode({ email, code })).toMatchObject({ email, code });
  });

  it('does not change counters by a non-string recipient', async () => {
    const auth = Services.service('auth');

    await expect(auth.incrementConfirmCodeCounterAsync({ email: [email] })).rejects.toThrow();
    const stored = await app.model('confirmCode').findOne({ where: { email } });
    expect(stored?.dataValues.counter).toBe(0);
  });
});
