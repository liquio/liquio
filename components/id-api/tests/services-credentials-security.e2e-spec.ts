import { TestApp, config } from './test_app';
import { Services } from '../src/services';

describe('Provider credentials stay private', () => {
  let app: TestApp;
  let userId: string;
  const email = 'services-security@example.test';
  let resetToken: string;
  let resetExpires: number;
  const govidToken = 'own-test-govid-upstream-token';
  const bearer = 'own-test-services-bearer';

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true, isForgotPasswordEnabled: true };
    config.notify = { url: 'http://notify-service', authorization: 'test' };
    app = await TestApp.setup();
    const user = await app.model('user').create({ email, provider: 'local', ipn: '#services-security' });
    userId = user.dataValues.userId;
    await app.model('userServices').create({
      userId,
      provider: 'local',
      provider_id: email,
      data: {
        password: await Services.service('passwordManager').hashPassword('V4l!dPassW0rd'),
        oldPasswords: ['test-old-hash'],
        isChangeRequired: false,
        passwordExpire: null,
        lastPasswordChangeDate: '2026-10-10',
      },
    });
    // Existing GovID rows from before the fix must also be safe to return.
    await app.model('userServices').create({
      userId,
      provider: 'govid',
      provider_id: 'own-test-govid-id',
      data: {
        surname: 'Test',
        raw: { govidAccessToken: govidToken, govidUserId: 'own-test-govid-id', nested: [{ access_token: 'test-access', label: 'public' }] },
      },
    });
    jest.spyOn(Services.service('notify'), 'sendMail').mockResolvedValue({} as any);
    await app.request().post('/user/password/forgot').send({ email }).expect(200);
    const local = await app.model('userServices').findOne({ where: { userId, provider: 'local' } });
    resetToken = (local!.dataValues.data as any).resetPasswordToken;
    resetExpires = (local!.dataValues.data as any).resetPasswordTokenExpireAt;
    expect(typeof resetToken).toBe('string');
    await app.model('accessToken').create({
      accessToken: bearer,
      userId,
      clientId: config.oauth!.defaults!.client_id as any,
      expires: new Date(Date.now() + 60000),
      scope: ['services'],
    });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (app) await app.destroy();
    await TestApp.afterAll();
  });

  function expectPublicServices(services: any) {
    expect(services.local.data).toEqual({ isChangeRequired: false, passwordExpire: null, lastPasswordChangeDate: '2026-10-10' });
    expect(services.govid.data).toEqual({ surname: 'Test', raw: { govidUserId: 'own-test-govid-id', nested: [{ label: 'public' }] } });
    expect(JSON.stringify(services)).not.toContain(resetToken);
    expect(JSON.stringify(services)).not.toContain(govidToken);
  }

  it('does not expose reset or upstream credentials through services scope, including repeated cached reads', async () => {
    for (let i = 0; i < 2; i++) {
      const response = await app.request().get('/user/info').auth(bearer, { type: 'bearer' }).expect(200);
      expectPublicServices(response.body.services);
    }
  });

  it('uses the same safe profile in administrative responses', async () => {
    const response = await app
      .request()
      .post('/user/info/id')
      .set('Authorization', `Basic ${config.oauth?.secret_key?.[0]}`)
      .send({ id: userId })
      .expect(200);
    expectPublicServices(response.body[0].services);
  });

  it('uses the same safe profile for basic user reads by id', async () => {
    const basic = `Basic ${config.oauth?.secret_key?.[0]}`;
    const byId = await app.request().get(`/user/${userId}`).set('Authorization', basic).expect(200);
    expectPublicServices(byId.body.services);
  });

  it('retains the original credentials in storage and allows a legitimate reset', async () => {
    const local = await app.model('userServices').findOne({ where: { userId, provider: 'local' } });
    expect((local!.dataValues.data as any).resetPasswordToken).toBe(resetToken);
    expect((local!.dataValues.data as any).resetPasswordTokenExpireAt).toBe(resetExpires);
    expect((local!.dataValues.data as any).oldPasswords).toEqual(['test-old-hash']);
    expect(await Services.service('passwordManager').verifyPassword('V4l!dPassW0rd', (local!.dataValues.data as any).password)).toBe(true);
    await app.request().post('/user/password/reset').send({ email, token: resetToken, password: 'NewP4ssw0!rd' }).expect(200);
  });
});
