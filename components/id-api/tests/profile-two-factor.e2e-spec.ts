import crypto from 'crypto';

import { TestApp } from './test_app';

describe('Profile 2FA settings (ID-09)', () => {
  let app: TestApp;
  let victim: { userId: string; token: string };

  const getUser = (userId: string) =>
    app
      .model('user')
      .findOne({ where: { userId } })
      .then((row) => row!.dataValues);
  const updateInfo = (body: Record<string, unknown>) =>
    app
      .request()
      .post('/user/info')
      .type('form')
      .send({ access_token: victim.token, ...body });

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    app = await TestApp.setup();
    const user = await app
      .model('user')
      .create(
        { ipn: '#3200000001', provider: 'local', email: 'id09@email.test', isActive: true, useTwoFactorAuth: true, twoFactorType: 'totp' } as any,
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
      scope: ['userId', 'email', 'isActive', 'profile:write'],
    } as any);
    victim = { userId: user.userId, token };
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  it('keeps 2FA enabled when a profile update omits the 2FA fields', async () => {
    const res = await updateInfo({ gender: 'male' });
    expect(res.status).toBe(200);
    const user = await getUser(victim.userId);
    expect(user.useTwoFactorAuth).toBe(true);
    expect(user.twoFactorType).toBe('totp');
  });

  it('applies explicitly submitted 2FA fields', async () => {
    await updateInfo({ gender: 'female', useTwoFactorAuth: 'true', twoFactorType: 'phone' }).expect(200);
    let user = await getUser(victim.userId);
    expect(user.useTwoFactorAuth).toBe(true);
    expect(user.twoFactorType).toBe('phone');

    await updateInfo({ useTwoFactorAuth: 'false' }).expect(200);
    user = await getUser(victim.userId);
    expect(user.useTwoFactorAuth).toBe(false);
  });
});
