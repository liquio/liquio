import crypto from 'crypto';

import { TestApp } from './test_app';

describe('POST /user/info honours the token scope (GI-20)', () => {
  let app: TestApp;
  let userId: string;
  let clientId: string;

  const getUser = () =>
    app
      .model('user')
      .findOne({ where: { userId } })
      .then((row) => row!.dataValues);

  const tokenWith = async (scope: unknown) => {
    const random = crypto.randomUUID();
    const accessToken = `${random.slice(0, 14)}1${random.slice(15)}`;
    await app.model('accessToken').create({
      accessToken,
      clientId,
      expires: new Date(Date.now() + 60 * 60 * 1000),
      userId,
      scope,
    } as any);
    return accessToken;
  };
  const write = (token: string, body: Record<string, unknown>) =>
    app
      .request()
      .post('/user/info')
      .type('form')
      .send({ access_token: token, ...body });

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    app = await TestApp.setup();
    const user = await app
      .model('user')
      .create({ ipn: '#3200000020', provider: 'local', email: 'gi20@email.test', isActive: true, gender: 'male' } as any, { returning: true })
      .then((row) => row.dataValues);
    userId = user.userId;
    clientId = await app
      .model('client')
      .findOne()
      .then((row) => (row?.dataValues as any).clientId);
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  it('rejects a write with a read-only scope and persists nothing', async () => {
    const token = await tokenWith(['userId', 'email', 'isActive']);
    await write(token, { gender: 'female' }).expect(403);
    expect((await getUser()).gender).toBe('male');
  });

  it('lets a token with `gender` change gender only, and rejects the whole request when it also sends phone', async () => {
    const token = await tokenWith(['userId', 'gender']);
    await write(token, { gender: 'female', phone: '+380501112233' }).expect(403);
    let user = await getUser();
    expect(user.phone).toBeFalsy();
    expect(user.gender).toBe('male');

    await write(token, { gender: 'female' }).expect(200);
    user = await getUser();
    expect(user.gender).toBe('female');
    expect(user.phone).toBeFalsy();
  });

  it('lets a `profile:write` token write the allowed fields', async () => {
    const token = await tokenWith(['profile:write']);
    await write(token, { gender: 'male' }).expect(200);
    expect((await getUser()).gender).toBe('male');
  });
});
