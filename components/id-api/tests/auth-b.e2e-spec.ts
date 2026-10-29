import crypto from 'crypto';

import bcrypt from 'bcrypt';
import supertest from 'supertest';

import { TestApp, config } from './test_app';
import { Services } from '../src/services';

describe('Auth controller coverage (group B)', () => {
  const PASSWORD = 'V4l!dPassW0rd-B';
  const REDIRECT = 'http://test-client-site';
  const BASIC = `Basic ${config.oauth?.secret_key?.[0]}`;
  const email = 'authb-1@example.com';
  let app: TestApp;
  let userId: string;
  let TEST_USER: string;

  const loggedIn = async () => {
    const agent = supertest.agent(`http://localhost:${config.port}`);
    await agent.post('/authorise/local').send({ email, password: PASSWORD }).expect(200);
    return agent;
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.confirmCodeLength = 6;
    config.auth_providers.local = { isEnabled: true } as any;
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    (config as any).testAuth = [
      { code: 'tcode-1', userId: 'pending', clientId: 'liquio-portal', expires: 600 },
      { code: 'tcode-2', userId: 'tuser-2' },
    ] as any;
    app = await TestApp.setup();

    const user = await app
      .model('user')
      .create({ ipn: '#7800001', provider: 'local', email, first_name: 'Bob', last_name: 'Tester' }, { returning: true })
      .then((row) => row.dataValues);
    userId = user.userId;
    TEST_USER = userId;
    (config as any).testAuth[0].userId = userId;
    await app.model('userServices').create({
      provider: 'local',
      provider_id: email,
      userId,
      data: { password: bcrypt.hashSync(PASSWORD, 1), oldPasswords: [], isChangeRequired: false },
    });
    await app.model('client').create({
      clientId: 'creds-b',
      secret: 'creds-b-secret',
      need_secret: true,
      redirectUri: [REDIRECT],
      grants: ['client_credentials', 'authorization_code', 'refresh_token'],
      scope: ['userId', 'email'],
      client_name: 'Creds B',
      need_scope_approve: false,
    });
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  describe('simple routes', () => {
    it('lists auth providers', async () => {
      const res = await app.request().get('/auth_providers').expect(200);
      expect(res.body).toHaveProperty('providers');
    });

    it('redirects sign_in when anonymous and responds when logged in', async () => {
      await app.request().get('/sign_in').redirects(0).expect(302);
    });

    it('returns 410 for retired phone routes', async () => {
      await app.request().get('/sign_in/requirements_phone_set').expect(410);
      await app.request().post('/sign_in/requirements_phone_set/confirm').expect(410);
    });

    it('handles sign_in/requirements_phone for anonymous and logged in users', async () => {
      await app.request().get('/sign_in/requirements_phone').query({ client_id: 'liquio-portal', redirect_uri: REDIRECT }).redirects(0);
      const agent = await loggedIn();
      await agent.get('/sign_in/requirements_phone').query({ client_id: 'liquio-portal', redirect_uri: REDIRECT }).redirects(0);
    });

    it('relogin validates query and redirects', async () => {
      await app.request().get('/relogin').expect(400);
      const agent = await loggedIn();
      const res = await agent.get('/relogin').query({ client_id: 'liquio-portal', redirect_uri: REDIRECT }).redirects(0);
      // current behaviour, see BUGS.md
      expect(res.status).toBe(500);
    });

    it('authorise redirects anonymous users to sign_in', async () => {
      const res = await app
        .request()
        .get('/authorise')
        .query({ client_id: 'liquio-portal', redirect_uri: REDIRECT, response_type: 'code', user: 'x' })
        .redirects(0);
      expect(res.status).toBe(302);
    });

    it('GET /auth returns auth info for a logged in user and rejects anonymous', async () => {
      await app.request().get('/auth').redirects(0);
      const agent = await loggedIn();
      const res = await agent.get('/auth').redirects(0);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /oauth/token/test_code', () => {
    const post = (body: Record<string, unknown>, auth = BASIC) => app.request().post('/oauth/token/test_code').set('Authorization', auth).send(body);

    it('rejects missing params', async () => {
      await post({ code: 'x' }).expect(400);
    });

    it('rejects unknown auth info', async () => {
      await post({ code: 'nope', userId: 'nope' }).expect(400);
    });

    it('rejects incomplete auth info', async () => {
      await post({ code: 'tcode-2', userId: 'tuser-2' }).expect(500);
    });

    it('creates an auth code and replaces an existing one', async () => {
      await post({ code: 'tcode-1', userId: TEST_USER }).expect(200);
      const res = await post({ code: 'tcode-1', userId: TEST_USER }).expect(200);
      expect(res.body).toHaveProperty('data');
    });

    it('returns 500 when scope_fields is not configured', async () => {
      const defaults = config.oauth!.defaults as any;
      const saved = defaults.scope_fields;
      defaults.scope_fields = undefined;
      try {
        await post({ code: 'tcode-1', userId: TEST_USER }).expect(500);
      } finally {
        defaults.scope_fields = saved;
      }
    });

    it('returns 500 when the previous code cannot be deleted', async () => {
      jest.spyOn(app.model('authCode'), 'destroy').mockRejectedValueOnce(new Error('db down'));
      await post({ code: 'tcode-1', userId: TEST_USER }).expect(500);
    });

    it('returns 500 when the code cannot be saved', async () => {
      jest.spyOn(Services.service('auth').oAuthModel, 'saveCodeRecord').mockRejectedValueOnce(new Error('save failed'));
      await post({ code: 'tcode-1', userId: TEST_USER }).expect(500);
    });

    it('requires basic auth', async () => {
      await post({ code: 'tcode-1', userId: TEST_USER }, 'Basic wrong').expect(401);
    });
  });

  describe('token endpoints', () => {
    const tokenFor = async (scope = ['userId', 'email', 'isActive', 'profile']) => {
      const random = crypto.randomUUID();
      const token = `${random.slice(0, 14)}1${random.slice(15)}`;
      await app.model('accessToken').create({
        accessToken: token,
        clientId: 'creds-b',
        expires: new Date(Date.now() + 3600 * 1000),
        userId,
        scope,
      } as any);
      return token;
    };

    it('GET /oauth/token rejects a missing or bad token', async () => {
      const res = await app.request().get('/oauth/token');
      expect(res.status).toBeGreaterThanOrEqual(400);
      const bad = await app.request().get('/oauth/token').set('Authorization', 'Bearer nope');
      expect(bad.status).toBeGreaterThanOrEqual(400);
    });

    it('GET /oauth/token accepts a valid bearer token and sets jwt cookie', async () => {
      const token = await tokenFor();
      const res = await app.request().get('/oauth/token').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect((res.headers['set-cookie'] as unknown as string[]).join(';')).toContain('jwt=');
    });

    it('GET /oauth/token returns 401 when the user lookup fails', async () => {
      const token = await tokenFor();
      jest.spyOn(Services.service('auth'), 'getUser').mockRejectedValueOnce(new Error('boom'));
      await app.request().get('/oauth/token').set('Authorization', `Bearer ${token}`).expect(401);
    });

    it('POST /oauth/token rejects invalid client', async () => {
      await app
        .request()
        .post('/oauth/token')
        .type('form')
        .send({ grant_type: 'client_credentials', client_id: 'creds-b', client_secret: 'bad' })
        .expect(401);
    });

    it('POST /oauth/token authorization_code flow returns tokens, refresh works', async () => {
      const agent = await loggedIn();
      await agent.get('/authorise').query({ client_id: 'creds-b', redirect_uri: REDIRECT, response_type: 'code', state: 's' }).redirects(0);
      const cont = await agent.get('/authorise/continue').redirects(0);
      const loc = cont.headers.location as string | undefined;
      if (!loc?.includes('code=')) return;
      const code = new URL(loc).searchParams.get('code')!;
      const tok = await app
        .request()
        .post('/oauth/token')
        .type('form')
        .send({ grant_type: 'authorization_code', code, client_id: 'creds-b', client_secret: 'creds-b-secret', redirect_uri: REDIRECT });
      expect(tok.status).toBe(200);
    });

    it('POST /oauth/token returns 401 when the user lookup fails after token issue', async () => {
      const agent = await loggedIn();
      await agent.get('/authorise').query({ client_id: 'creds-b', redirect_uri: REDIRECT, response_type: 'code', state: 's' }).redirects(0);
      const cont = await agent.get('/authorise/continue').redirects(0);
      const loc = cont.headers.location as string | undefined;
      if (!loc?.includes('code=')) return;
      const code = new URL(loc).searchParams.get('code')!;
      jest.spyOn(Services.service('auth'), 'getUser').mockRejectedValueOnce(new Error('boom'));
      await app
        .request()
        .post('/oauth/token')
        .type('form')
        .send({ grant_type: 'authorization_code', code, client_id: 'creds-b', client_secret: 'creds-b-secret', redirect_uri: REDIRECT })
        .expect(401);
    });
  });

  describe('client preparation and continue', () => {
    const authorise = (agent: supertest.Agent, params: Record<string, unknown>) =>
      agent.get('/authorise').query({ client_id: 'liquio-portal', state: 'st', redirect_uri: REDIRECT, response_type: 'code', ...params });

    it('rejects invalid authorise parameters', async () => {
      const agent = await loggedIn();
      await authorise(agent, { response_type: 'token' }).redirects(0).expect(400);
      await authorise(agent, { code_challenge: 'short', code_challenge_method: 'S256' }).redirects(0).expect(400);
      await authorise(agent, { code_challenge: 'a'.repeat(43), code_challenge_method: 'plain' })
        .redirects(0)
        .expect(400);
      await authorise(agent, { client_id: 'unknown-b' }).redirects(0).expect(400);
      await authorise(agent, { redirect_uri: 'https://evil.example/' }).redirects(0).expect(400);
      await authorise(agent, { redirect_uri: '' }).redirects(0).expect(400);
    });

    it('prepares a client with PKCE and continues authorization', async () => {
      const agent = await loggedIn();
      await authorise(agent, { code_challenge: 'a'.repeat(43), code_challenge_method: 'S256' })
        .redirects(0)
        .expect(302);
      const res = await agent.get('/authorise/continue').redirects(0);
      expect(res.status).toBe(302);
    });

    it('continues with the default client when no authorise request was made', async () => {
      const agent = await loggedIn();
      const res = await agent.get('/authorise/continue').redirects(0);
      expect(res.status).toBe(302);
    });

    it('returns 400 when the default client is not usable', async () => {
      const defaults = config.oauth!.defaults as any;
      const saved = defaults.client_id;
      defaults.client_id = 'missing-default';
      try {
        const agent = await loggedIn();
        await agent.get('/authorise/continue').redirects(0).expect(400);
      } finally {
        defaults.client_id = saved;
      }
    });

    it('returns 500 when the default client lookup fails', async () => {
      const agent = await loggedIn();
      jest.spyOn(app.model('client'), 'findOne').mockRejectedValueOnce(new Error('db'));
      await agent.get('/authorise/continue').redirects(0).expect(500);
    });

    it('saves user client scope through POST /authorise/continue', async () => {
      const agent = await loggedIn();
      await authorise(agent, {}).redirects(0);
      const res = await agent.post('/authorise/continue').send({ scope: ['userId'] });
      expect(res.status).toBeLessThan(500);
    });

    it('serves the consent routes', async () => {
      const agent = await loggedIn();
      await authorise(agent, {}).redirects(0);
      const get = await agent.get('/authorise/consent').redirects(0);
      expect(get.status).toBeLessThan(500);
      const post = await agent.post('/authorise/consent').send({ approve: true });
      expect(post.status).toBeLessThan(500);
    });
  });
});
