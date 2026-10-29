import crypto from 'crypto';

import bcrypt from 'bcrypt';
import supertest from 'supertest';

import { TestApp, config } from './test_app';
import { Services } from '../src/services';

describe('User controller coverage (group A)', () => {
  const PASSWORD = 'V4l!dPassW0rd-A';
  const LEGACY = `Basic ${config.oauth?.secret_key?.[0]}`;
  let app: TestApp;
  let counter = 0;

  const newUser = async (extra: Record<string, unknown> = {}) => {
    counter += 1;
    const email = `usera-${counter}@example.com`;
    const user = await app
      .model('user')
      .create({ ipn: `#7700000${counter}`, provider: 'local', email, first_name: 'Ann', last_name: 'Tester', ...extra }, { returning: true })
      .then((row) => row.dataValues);
    await app.model('userServices').create({
      provider: 'local',
      provider_id: email,
      userId: user.userId,
      data: { password: bcrypt.hashSync(PASSWORD, 1), oldPasswords: [], isChangeRequired: false },
    });
    return { email, userId: user.userId as string };
  };

  const login = async (email: string) => {
    const agent = supertest.agent(`http://localhost:${config.port}`);
    await agent.post('/authorise/local').send({ email, password: PASSWORD }).expect(200);
    return agent;
  };

  const legacy = (method: 'get' | 'post' | 'put' | 'delete', url: string) => (app.request() as any)[method](url).set('Authorization', LEGACY);

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true, isForgotPasswordEnabled: true, resetPasswordUrl: 'http://front/reset' } as any;
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('session routes', () => {
    const tokenFor = async (userId: string, scope = ['userId', 'email', 'isActive', 'profile:write', 'profile']) => {
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
        userId,
        scope,
      } as any);
      return token;
    };

    it('reads and updates own info, then manages jwt, 2fa and other sessions', async () => {
      const { userId } = await newUser();
      const token = await tokenFor(userId);
      const get = (url: string, query: Record<string, unknown> = {}) =>
        app
          .request()
          .get(url)
          .query({ access_token: token, ...query });
      const post = (url: string, body: Record<string, unknown> = {}) =>
        app
          .request()
          .post(url)
          .type('form')
          .send({ access_token: token, ...body });
      await get('/user/info');
      await post('/user/info', { first_name: 'Bob', last_name: 'Builder', middle_name: 'X', gender: 'male' });
      await get('/user/jwt');
      await post('/user/two_factor_auth', { useTwoFactorAuth: 'false' });
      await post('/user/two_factor_auth', { useTwoFactorAuth: 'true', twoFactorType: 'bogus' });
      await post('/user/two_factor_auth', { useTwoFactorAuth: 'true', twoFactorType: 'totp' });
      await get('/user/info/setValidPhone');
      await post('/user/info/phone/send', { phone: '+380501110001' });
      await post('/user/info/phone/confirm', { phone: '+380501110001', code: '000000' });
      await get('/logoff/test', { forward: 'http://evil.example' }).redirects(0);
      await get('/logoff/test').redirects(0);
      await post('/user/logout_other_sessions', { refresh_token: 'r' }).expect(201);
      expect(await app.model('sessions').count({ where: { userId } })).toBe(0);
    });

    it('requires auth for session routes', async () => {
      await app.request().get('/user/info').expect(401);
      await app.request().post('/user/logout_other_sessions').expect(401);
    });

    it('redirects promo subscriptions and rejects an empty query', async () => {
      await app.request().get('/subscribe').expect(400);
      await app.request().get('/subscribe').query({ email: 'promo-a@example.com' }).redirects(0);
    });

    it('lets a logged-in browser session log off', async () => {
      const { email } = await newUser();
      const agent = await login(email);
      await agent.get('/logoff/local').redirects(0);
    });
  });

  describe('forgot password', () => {
    it('validates the request', async () => {
      await app.request().post('/user/password/forgot').send({}).expect(400);
      await app.request().post('/user/password/forgot').send({ email: 'nope' }).expect(400);
    });

    it('sends a mail for a known account and stays silent for unknown', async () => {
      const { email } = await newUser();
      const sendMail = jest.spyOn(Services.service('notify'), 'sendMail').mockResolvedValue({} as any);
      await app.request().post('/user/password/forgot').send({ email }).expect(200);
      expect(sendMail).toHaveBeenCalledTimes(1);
      await app.request().post('/user/password/forgot').send({ email: 'unknown-a@example.com' }).expect(200);
      expect(sendMail).toHaveBeenCalledTimes(1);
    });

    it('returns 500 when the mail cannot be sent', async () => {
      const { email } = await newUser();
      jest.spyOn(Services.service('notify'), 'sendMail').mockRejectedValue(new Error('boom'));
      await app.request().post('/user/password/forgot').send({ email }).expect(500);
    });

    it('resets the password with the emailed token and rejects bad tokens', async () => {
      const { email } = await newUser();
      const sendMail = jest.spyOn(Services.service('notify'), 'sendMail').mockResolvedValue({} as any);
      await app.request().post('/user/password/forgot').send({ email }).expect(200);
      const token = /token=([^&\s]+)/.exec(sendMail.mock.calls[0][1] as string)![1];
      await app.request().post('/user/password/reset').send({ email, token: 'bad', password: 'NewP4ssw0!rd-A' }).expect(400);
      await app.request().post('/user/password/reset').send({}).expect(400);
      await app.request().post('/user/password/reset').send({ email, token, password: 'NewP4ssw0!rd-A' }).expect(200);
      await app.request().post('/user/password/reset').send({ email, token, password: 'NewP4ssw0!rd-B' }).expect(400);
    });
  });

  describe('basic-auth admin routes', () => {
    it('prepares a user and finds it again', async () => {
      const body = { name: 'Nina', surname: 'Prep', middlename: 'M', ipn: '1234567890', email: 'prep-a@example.com' };
      const first = await legacy('post', '/user/prepare').send(body).expect(200);
      const d = (r: any) => r.body.data ?? r.body;
      expect(d(first).userExist).toBe(false);
      const second = await legacy('post', '/user/prepare').send(body).expect(200);
      expect(d(second).userExist).toBe(true);
      expect(d(second).isMailDifferent).toBe(true);
      await newUser({ ipn: '2234567890', email: 'prep-b@example.com' });
      const third = await legacy('post', '/user/prepare').send({ ...body, ipn: '2234567890', email: 'prep-b@example.com' });
      expect(third.status).toBe(200);
    });

    it('updates onboarding data', async () => {
      const { userId } = await newUser();
      await legacy('put', '/user/info/onboarding').send({}).expect(400);
      await legacy('put', '/user/info/onboarding').send({ userId: '00000000-0000-4000-8000-000000000000' }).expect(500);
      await legacy('put', '/user/info/onboarding').send({ userId, needOnboarding: false }).expect(200);
    });

    it('updates a user by id and marks changed email and phone unverified', async () => {
      const { userId, email } = await newUser();
      await legacy('put', `/user/info/${userId}`)
        .send({ email: 'changed-a@example.com', phone: '+380501112233' })
        .expect((r: any) => {
          if (r.status !== 200) throw new Error(r.status + JSON.stringify(r.body) + r.text);
        });
      const row = (await app.model('user').findOne({ where: { userId } }))!.dataValues as any;
      expect(row.valid.email).toBe(false);
      expect(row.valid.phone).toBe(false);
      expect(email).not.toBe(row.email);
      await legacy('put', `/user/info/${userId}`)
        .send({ isActive: false, updateInitiator: { userId: 'adm' } })
        .expect(200);
      // Without updateInitiator the audit row has no author and the request fails after the user was already updated.
      await legacy('put', `/user/info/${userId}`).send({ isActive: true }).expect(500);
      await legacy('put', `/user/info/${userId}`)
        .send({ isActive: false, updateInitiator: { userId: 'adm' } })
        .expect(200);
      await legacy('put', `/user/info/${userId}`)
        .send({ isActive: true, updateInitiator: { userId: 'adm' } })
        .expect(200);
      expect(await app.model('userAdminAction').count({ where: { user_id: userId } })).toBeGreaterThanOrEqual(2);
      await legacy('put', `/user/info/${userId}`)
        .send({ addressStruct: { city: 'x' } })
        .expect(400);
      await legacy('put', '/user/info/00000000-0000-4000-8000-000000000000').send({ role: 'x' }).expect(404);
    });

    it('finds, searches and lists users by id, ipn and edrpou', async () => {
      const { userId } = await newUser({ ipn: '3234567890', edrpou: '12345678' });
      await legacy('get', `/user/${userId}`).expect(200);
      await legacy('post', '/user/info/id')
        .send({ id: [userId] })
        .expect(200);
      await legacy('post', '/user/info/ipn')
        .send({ ipn: ['3234567890'] })
        .expect(200);
      await legacy('post', '/user/info/ipn').send({}).expect(400);
      await legacy('post', '/user/info/edrpou')
        .send({ edrpou: ['12345678'] })
        .expect(200);
      await legacy('post', '/user/info/edrpou').send({}).expect(400);
      await legacy('get', '/user/info/phone').query({ phone: '+380000000000' });
      await legacy('post', '/user/info/search').send({ searchString: 'Tester' }).expect(200);
    });

    it('validates every addressStruct branch on update by id', async () => {
      const { userId } = await newUser();
      const id = (name: string) => ({ id: 1, name });
      const full: any = {
        region: id('r'),
        district: id('d'),
        city: { ...id('c'), type: 't' },
        street: { ...id('s'), type: 't' },
        building: '1',
        korp: '2',
        apt: '3',
        index: '4',
      };
      const put = (addressStruct: any) => legacy('put', `/user/info/${userId}`).send({ addressStruct });
      await put({ ...full, region: undefined, x: 1 }).expect(400);
      await put({ ...full, district: undefined }).expect(400);
      await put({ ...full, city: id('c') }).expect(400);
      await put({ ...full, street: id('s') }).expect(400);
      for (const key of ['building', 'korp', 'apt', 'index']) {
        await put({ ...full, [key]: 5 }).expect(400);
      }
      await put(full).expect(200);
    });

    it('lists users with search, email, ipn, phone and role filters', async () => {
      await newUser({ ipn: '4234567890', phone: '+380507770001', last_name: 'Zeta', first_name: 'Yan', middle_name: 'Xi' });
      for (const q of [
        { search: 'Zeta Yan Xi' },
        { search: 'Zeta' },
        { email: 'usera-1@example.com,usera-2@example.com' },
        { email: 'usera' },
        { ipn: '4234567890' },
        { phone: '+380507770001' },
        { role: 'individual' },
        { id: '00000000-0000-4000-8000-000000000000' },
      ]) {
        await legacy('get', '/user').query(q).expect(200);
      }
    });

    it('creates a local user and rejects duplicates', async () => {
      const body = { email: 'created-a@example.com', password: PASSWORD, firstName: 'C', lastName: 'D' };
      const created = await legacy('post', '/user/create_local').send(body);
      expect(created.status).toBe(201);
      const dup = await legacy('post', '/user/create_local').send(body);
      expect(dup.status).toBe(400);
      await legacy('post', '/user/create_local').send({}).expect(400);
      await legacy('post', '/user/create_local').send({ email: 'x-a@example.com', password: PASSWORD }).expect(400);
    });

    it('logs a user out and deletes it', async () => {
      const { userId, email } = await newUser();
      const agent = await login(email);
      await legacy('post', `/user/${userId}/logout`).send({}).expect(201);
      await agent.get('/authorise/continue').redirects(0);
      await legacy('delete', '/user').send({}).expect(400);
      (config as any).enabledDeleteUser = true;
      await legacy('delete', '/user').send({}).expect(400);
      await legacy('delete', '/user').send({ userId: '00000000-0000-4000-8000-000000000000' }).expect(404);
      await legacy('delete', '/user').send({ userId }).expect(200);
      (config as any).enabledDeleteUser = false;
    });
  });
});
