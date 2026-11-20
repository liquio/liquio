import bcrypt from 'bcrypt';
import supertest from 'supertest';

import { TestApp, config } from './test_app';
import { Services } from '../src/services';

describe('POST /user/password/set (KS-26)', () => {
  const OLD_PASSWORD = 'V4l!dPassW0rd';
  const NEW_PASSWORD = 'NewP4ssw0!rd';
  const basic = (name: string, secret: string) => `Basic ${Buffer.from(`${name}:${secret}`).toString('base64')}`;
  const LEGACY = `Basic ${config.oauth?.secret_key?.[0]}`;
  const SETTER = basic('pw-setter', 'pw-setter-s3cret');
  const READER = basic('pw-reader', 'pw-reader-s3cret');
  let app: TestApp;
  let counter = 0;

  const newUser = async (data: Record<string, unknown> = {}, withService = true) => {
    counter += 1;
    const email = `pwset-${counter}@example.com`;
    const user = await app
      .model('user')
      .create({ ipn: `#97000000${counter}`, provider: 'local', email }, { returning: true })
      .then((row) => row.dataValues);
    if (withService) {
      await app.model('userServices').create({
        provider: 'local',
        provider_id: email,
        userId: user.userId,
        data: { password: bcrypt.hashSync(OLD_PASSWORD, 1), oldPasswords: [], isChangeRequired: false, ...data },
      });
    }
    return { email, userId: user.userId };
  };
  const localData = (userId: string) =>
    app
      .model('userServices')
      .findOne({ where: { userId, provider: 'local' } })
      .then((row) => row!.dataValues.data as any);
  const actions = (userId: string) =>
    app
      .model('userAdminAction')
      .findAll({ where: { user_id: userId } })
      .then((rows) => rows.map((row) => row.dataValues));
  const login = async (email: string, password = OLD_PASSWORD) => {
    const agent = supertest.agent(`http://localhost:${config.port}`);
    await agent.post('/authorise/local').send({ email, password }).expect(200);
    return agent;
  };
  const setPassword = (body: Record<string, unknown>, authorization = SETTER) =>
    app.request().post('/user/password/set').set('Authorization', authorization).send(body);

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true, isForgotPasswordEnabled: true, resetPasswordUrl: 'http://front/reset' } as any;
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    config.basic_auth = {
      allowLegacySharedSecret: true,
      clients: [
        { name: 'pw-setter', secret: 'pw-setter-s3cret', scopes: ['password:set'] },
        { name: 'pw-reader', secret: 'pw-reader-s3cret', scopes: ['user:read'] },
      ],
    };
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(() => {
    config.auth_providers.local = {
      isEnabled: true,
      isForgotPasswordEnabled: true,
      resetPasswordUrl: 'http://front/reset',
    } as any;
    config.passwordManager = { ...(config.passwordManager ?? {}), allowAdminSet: true };
  });

  afterEach(() => jest.restoreAllMocks());

  it('requires the password:set scope', async () => {
    const user = await newUser();
    await setPassword({ userId: user.userId, password: NEW_PASSWORD }, READER).expect(403);
    await setPassword({ userId: user.userId, password: NEW_PASSWORD }, basic('pw-setter', 'wrong')).expect(401);
    expect(bcrypt.compareSync(OLD_PASSWORD, (await localData(user.userId)).password)).toBe(true);
  });

  it('rejects the email field and does not change the user email', async () => {
    const user = await newUser();
    await setPassword({ userId: user.userId, email: 'attacker@example.com', password: NEW_PASSWORD }).expect(400);
    const row = await app.model('user').findOne({ where: { userId: user.userId } });
    expect(row!.dataValues.email).toBe(user.email);
    expect(bcrypt.compareSync(OLD_PASSWORD, (await localData(user.userId)).password)).toBe(true);
  });

  it('answers 404 and creates nothing when the local provider is disabled', async () => {
    const user = await newUser({}, false);
    config.auth_providers.local = { isEnabled: false } as any;
    await setPassword({ userId: user.userId, password: NEW_PASSWORD }).expect(404);
    expect(await app.model('userServices').count({ where: { userId: user.userId, provider: 'local' } })).toBe(0);
  });

  it('with the flag on: sets the password, keeps other data keys, clears reset tokens, revokes sessions and audits the service', async () => {
    const user = await newUser({ custom: 'keep-me', resetPasswordTokenHash: 'h', resetPasswordTokenExpireAt: Date.now() + 60_000 });
    await login(user.email);
    expect(await app.model('sessions').count({ where: { userId: user.userId } })).toBeGreaterThan(0);

    await setPassword({ userId: user.userId, password: NEW_PASSWORD }).expect(200, { success: true });

    const data = await localData(user.userId);
    expect(bcrypt.compareSync(NEW_PASSWORD, data.password)).toBe(true);
    expect(data.isChangeRequired).toBe(true);
    expect(data.custom).toBe('keep-me');
    expect(data.resetPasswordTokenHash).toBeUndefined();
    expect(data.resetPasswordTokenExpireAt).toBeUndefined();
    expect(await app.model('sessions').count({ where: { userId: user.userId } })).toBe(0);
    const rows = await actions(user.userId);
    expect(rows).toHaveLength(1);
    expect(rows[0].created_by).toEqual({ service: 'pw-setter' });
    expect(rows[0].action_type).toBe('update');
  });

  it('with the flag on: refuses a weak password and a missing email on the user', async () => {
    const user = await newUser();
    await setPassword({ userId: user.userId, password: '1' }).expect(400);
    const noEmail = await newUser();
    await app.model('user').update({ email: null as any }, { where: { userId: noEmail.userId } });
    await setPassword({ userId: noEmail.userId, password: NEW_PASSWORD }).expect(400);
  });

  describe('with allowAdminSet=false', () => {
    beforeEach(() => {
      config.passwordManager = { ...(config.passwordManager ?? {}), allowAdminSet: false };
    });

    it('rejects a caller-chosen password and changes nothing', async () => {
      const user = await newUser();
      const sendMail = jest.spyOn(Services.service('notify'), 'sendMail').mockResolvedValue({} as any);
      await setPassword({ userId: user.userId, password: NEW_PASSWORD }).expect(400);
      expect(sendMail).not.toHaveBeenCalled();
      expect(bcrypt.compareSync(OLD_PASSWORD, (await localData(user.userId)).password)).toBe(true);
    });

    it('emails a single-use reset link, never returns it, keeps the password, revokes sessions and audits', async () => {
      const user = await newUser({ custom: 'keep-me' });
      await login(user.email);
      const sendMail = jest.spyOn(Services.service('notify'), 'sendMail').mockResolvedValue({} as any);

      const res = await setPassword({ userId: user.userId }).expect(200);
      expect(res.body).toEqual({ success: true });

      expect(sendMail).toHaveBeenCalledTimes(1);
      const [to, body] = sendMail.mock.calls[0];
      expect(to).toBe(user.email);
      const token = new URL(`http://x/${(body as string).slice((body as string).indexOf('?'))}`).searchParams.get('token')!;
      expect(JSON.stringify(res.body) + JSON.stringify(res.headers)).not.toContain(token);

      const data = await localData(user.userId);
      expect(bcrypt.compareSync(OLD_PASSWORD, data.password)).toBe(true);
      expect(data.custom).toBe('keep-me');
      expect(data.resetPasswordTokenHash).toBe(Services.service('passwordManager').hashToken(token));
      expect(JSON.stringify(data)).not.toContain(token);
      expect(await app.model('sessions').count({ where: { userId: user.userId } })).toBe(0);
      const rows = await actions(user.userId);
      expect(rows).toHaveLength(1);
      expect(rows[0].created_by).toEqual({ service: 'pw-setter' });

      await app.request().post('/user/password/reset').send({ email: user.email, token, password: NEW_PASSWORD }).expect(200);
    });

    it('answers 409 for a user without a local login and works with the legacy secret', async () => {
      const bare = await newUser({}, false);
      await setPassword({ userId: bare.userId }).expect(409);
      jest.spyOn(Services.service('notify'), 'sendMail').mockResolvedValue({} as any);
      const user = await newUser();
      await setPassword({ userId: user.userId }, LEGACY).expect(200);
    });
  });
});
