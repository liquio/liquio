import bcrypt from 'bcrypt';
import supertest from 'supertest';

import { TestApp, config } from './test_app';

describe('Password mutation revokes access and reset tokens', () => {
  const REDIRECT = 'http://test-client-site';
  const CLIENT = { id: 'revocation-client', secret: 'revocation-client-s3cret' };
  const OLD_PASSWORD = 'V4l!dPassW0rd';
  const NEW_PASSWORD = 'NewP4ssw0!rd';
  let app: TestApp;
  let counter = 0;

  const newUser = async (data: Record<string, unknown> = {}) => {
    counter += 1;
    const email = `revocation-${counter}@example.com`;
    const user = await app
      .model('user')
      .create({ ipn: `#99000000${counter}`, provider: 'local', email }, { returning: true })
      .then((row) => row.dataValues);
    await app.model('userServices').create({
      provider: 'local',
      provider_id: email,
      userId: user.userId,
      data: { password: bcrypt.hashSync(OLD_PASSWORD, 1), oldPasswords: [], isChangeRequired: false, ...data },
    });
    return { email, userId: user.userId };
  };

  const localData = (userId: string) =>
    app
      .model('userServices')
      .findOne({ where: { userId, provider: 'local' } })
      .then((row) => row!.dataValues.data as any);

  const login = async (email: string, password = OLD_PASSWORD) => {
    const agent = supertest.agent(`http://localhost:${config.port}`);
    await agent.post('/authorise/local').send({ email, password }).expect(200);
    return agent;
  };

  // Issues an access/refresh token pair through the authorization code flow.
  const issueTokens = async (agent: supertest.Agent) => {
    await agent
      .get('/authorise')
      .query({ client_id: CLIENT.id, response_type: 'code', state: 'st', redirect_uri: REDIRECT })
      .redirects(0)
      .expect(302);
    const response = await agent.get('/authorise/continue').redirects(0).expect(302);
    const code = new URL(response.headers.location).searchParams.get('code')!;
    const { body } = await app
      .request()
      .post('/oauth/token')
      .type('form')
      .send({ grant_type: 'authorization_code', code, client_id: CLIENT.id, client_secret: CLIENT.secret, redirect_uri: REDIRECT })
      .expect(200);
    return { accessToken: body.access_token as string, refreshToken: body.refresh_token as string, code };
  };

  // A revoked session is anonymous: the browser flow cannot continue to issue a code.
  const expectNoSession = async (agent: supertest.Agent) => {
    const res = await agent
      .get('/authorise')
      .query({ client_id: CLIENT.id, response_type: 'code', state: 'st', redirect_uri: REDIRECT })
      .redirects(0);
    expect(res.headers.location ?? '').not.toContain('/authorise/continue');
    const next = await agent.get('/authorise/continue').redirects(0);
    expect(next.headers.location ?? '').not.toContain('code=');
  };

  const userInfo = (accessToken: string) => app.request().get('/user/info').query({ access_token: accessToken });
  const refresh = (refreshToken: string) =>
    app
      .request()
      .post('/oauth/token')
      .type('form')
      .send({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: CLIENT.id, client_secret: CLIENT.secret });
  const changePassword = (email: string, oldPassword = OLD_PASSWORD, newPassword = NEW_PASSWORD) =>
    app.request().post('/authorise/local/change_password').send({ email, oldPassword, newPassword });
  const adminSetPassword = (userId: string, password = NEW_PASSWORD) =>
    app.request().post('/user/password/set').set('Authorization', `Basic ${config.oauth?.secret_key?.[0]}`).send({ userId, password });
  const resetPassword = (email: string, token: string, password = NEW_PASSWORD) =>
    app.request().post('/user/password/reset').send({ email, token, password });

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();

    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true, isForgotPasswordEnabled: true };
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };

    app = await TestApp.setup();

    await app.model('client').create({
      clientId: CLIENT.id,
      secret: CLIENT.secret,
      need_secret: true,
      redirectUri: [REDIRECT],
      grants: ['authorization_code', 'refresh_token'],
      scope: [],
      client_name: 'Revocation client',
      need_scope_approve: false,
    });
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  describe.each([
    ['user password change', (u: { email: string; userId: string }) => changePassword(u.email)],
    ['administrative password set', (u: { email: string; userId: string }) => adminSetPassword(u.userId)],
  ])('after %s', (_name, mutate) => {
    it('revokes sessions, access tokens, refresh tokens and unexchanged codes', async () => {
      const user = await newUser();
      const agent = await login(user.email);
      const { accessToken, refreshToken } = await issueTokens(agent);
      const pending = await issueTokens(await login(user.email)).then(async () => {
        const other = await login(user.email);
        await other
          .get('/authorise')
          .query({ client_id: CLIENT.id, response_type: 'code', state: 'st', redirect_uri: REDIRECT })
          .redirects(0)
          .expect(302);
        const response = await other.get('/authorise/continue').redirects(0).expect(302);
        return new URL(response.headers.location).searchParams.get('code')!;
      });

      await userInfo(accessToken).expect(200);
      expect(await app.model('sessions').count({ where: { userId: user.userId } })).toBeGreaterThan(0);

      await mutate(user).expect(200);

      await userInfo(accessToken).expect(401);
      await refresh(refreshToken).expect((res) => expect(res.status).toBeGreaterThanOrEqual(400));
      await app
        .request()
        .post('/oauth/token')
        .type('form')
        .send({ grant_type: 'authorization_code', code: pending, client_id: CLIENT.id, client_secret: CLIENT.secret, redirect_uri: REDIRECT })
        .expect((res) => expect(res.status).toBeGreaterThanOrEqual(400));
      await expectNoSession(agent);
      expect(await app.model('accessToken').count({ where: { userId: user.userId } })).toBe(0);
      expect(await app.model('refreshToken').count({ where: { userId: user.userId } })).toBe(0);
      expect(await app.model('sessions').count({ where: { userId: user.userId } })).toBe(0);
    });

    it('keeps the user able to log in and to get new tokens with the new password', async () => {
      const user = await newUser();
      await mutate(user).expect(200);

      await app.request().post('/authorise/local').send({ email: user.email, password: OLD_PASSWORD }).expect(401);
      const agent = await login(user.email, NEW_PASSWORD);
      const { accessToken } = await issueTokens(agent);
      await userInfo(accessToken).expect(200);
    });
  });

  it('does not revoke anything when the password change is rejected', async () => {
    const user = await newUser();
    const { accessToken } = await issueTokens(await login(user.email));

    await changePassword(user.email, 'wrong-password').expect(401);
    await changePassword(user.email, OLD_PASSWORD, 'weak').expect(400);

    await userInfo(accessToken).expect(200);
    expect(bcrypt.compareSync(OLD_PASSWORD, (await localData(user.userId)).password)).toBe(true);
  });

  it('does not accept a stale session resaved after the password change', async () => {
    const user = await newUser();
    const agent = await login(user.email);
    const rows = await app.model('sessions').findAll({ where: { userId: user.userId } });
    expect(rows.length).toBeGreaterThan(0);

    await adminSetPassword(user.userId).expect(200);
    // Simulate a concurrent request that resaved the deleted session.
    for (const row of rows) await app.model('sessions').create(row.dataValues);

    await agent.get('/authorise/continue').redirects(0).expect(401);
  });

  describe('reset token', () => {
    const seedToken = (userId: string, expiresIn = 60_000, token = 'reset-token-1') =>
      app.model('userServices').update(
        {
          data: {
            ...({ password: bcrypt.hashSync(OLD_PASSWORD, 1), oldPasswords: [], isChangeRequired: false } as any),
            resetPasswordToken: token,
            resetPasswordTokenExpireAt: Date.now() + expiresIn,
          },
        },
        { where: { userId, provider: 'local' } },
      );

    it('resets the password once, consumes the token and its expiry, and revokes access', async () => {
      const user = await newUser();
      await seedToken(user.userId);
      const { accessToken, refreshToken } = await issueTokens(await login(user.email));

      await resetPassword(user.email, 'reset-token-1').expect(200);

      const data = await localData(user.userId);
      expect(bcrypt.compareSync(NEW_PASSWORD, data.password)).toBe(true);
      expect(data.resetPasswordToken).toBeUndefined();
      expect(data.resetPasswordTokenExpireAt).toBeUndefined();
      await userInfo(accessToken).expect(401);
      await refresh(refreshToken).expect((res) => expect(res.status).toBeGreaterThanOrEqual(400));
    });

    it('rejects a replay of a consumed token', async () => {
      const user = await newUser();
      await seedToken(user.userId);

      await resetPassword(user.email, 'reset-token-1').expect(200);
      await resetPassword(user.email, 'reset-token-1', 'An0ther!Passw0rd').expect(400);

      expect(bcrypt.compareSync(NEW_PASSWORD, (await localData(user.userId)).password)).toBe(true);
    });

    it('rejects a token whose expiry field was cleared', async () => {
      const user = await newUser();
      await seedToken(user.userId);
      const data = await localData(user.userId);
      delete data.resetPasswordTokenExpireAt;
      await app.model('userServices').update({ data }, { where: { userId: user.userId, provider: 'local' } });

      await resetPassword(user.email, 'reset-token-1').expect(400);

      expect(bcrypt.compareSync(OLD_PASSWORD, (await localData(user.userId)).password)).toBe(true);
    });

    it('rejects an expired token and keeps the old password and tokens', async () => {
      const user = await newUser();
      await seedToken(user.userId, -1000);
      const { accessToken } = await issueTokens(await login(user.email));

      await resetPassword(user.email, 'reset-token-1').expect(400);

      expect(bcrypt.compareSync(OLD_PASSWORD, (await localData(user.userId)).password)).toBe(true);
      await userInfo(accessToken).expect(200);
    });

    it('keeps the old password and the token when the new password is rejected', async () => {
      const user = await newUser();
      await seedToken(user.userId);

      await resetPassword(user.email, 'reset-token-1', 'weak').expect(400);
      await resetPassword(user.email, 'wrong-token').expect(400);
      await resetPassword(user.email, 'reset-token-1', OLD_PASSWORD).expect(200);

      const data = await localData(user.userId);
      expect(data.resetPasswordToken).toBeUndefined();
    });

    it('lets only one of concurrent resets succeed', async () => {
      const user = await newUser();
      await seedToken(user.userId);

      const results = await Promise.all([
        resetPassword(user.email, 'reset-token-1', 'F1rst!Passw0rd'),
        resetPassword(user.email, 'reset-token-1', 'S3cond!Passw0rd'),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    });
  });
});
