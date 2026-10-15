import bcrypt from 'bcrypt';
import supertest from 'supertest';

import { TestApp, config } from './test_app';

describe('AuthController - account policy on /authorise/continue', () => {
  const password = 'V4l!dPassW0rd';
  const REGISTERED_URI = 'http://test-client-site';
  let app: TestApp;

  const users = {
    allowed: { email: 'policy-allowed@email', ipn: '#3000000001', userId: '' },
    blocked: { email: 'policy-blocked@email', ipn: '#3000000002', userId: '' },
    changed: { email: 'policy-changed@email', ipn: '#3000000003', userId: '' },
  };
  type Key = keyof typeof users;

  const newAgent = () => supertest.agent(`http://localhost:${config.port}`);

  // Logs in and starts the authorization code flow.
  async function startFlow(key: Key, prepareClient = true): Promise<supertest.Agent> {
    const agent = newAgent();
    await agent.post('/authorise/local').send({ email: users[key].email, password }).expect(200);
    if (prepareClient) {
      await agent
        .get('/authorise')
        .query({ client_id: 'liquio-portal', state: 'st', redirect_uri: REGISTERED_URI, response_type: 'code' })
        .redirects(0)
        .expect(302);
    }
    return agent;
  }

  const codeCount = () => app.model('authCode').count();

  const expectNoCode = (response: supertest.Response, status: number) => {
    expect(response.status).toBe(status);
    expect(response.headers.location ?? '').not.toContain(REGISTERED_URI);
    expect(response.headers.location ?? '').not.toContain('code=');
  };

  const expectCode = (response: supertest.Response) => {
    expect(response.status).toBe(302);
    const url = new URL(response.headers.location);
    expect(url.origin).toBe(REGISTERED_URI);
    expect(url.searchParams.get('code')).toMatch(/^[a-f0-9]{64}$/);
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();

    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true };

    app = await TestApp.setup();

    for (const key of Object.keys(users) as Key[]) {
      const { email, ipn } = users[key];
      const user = await app
        .model('user')
        .create({ ipn, provider: 'local', email, userIdentificationType: 'eds', edrpou: '11111111' } as any, { returning: true })
        .then((row) => row.dataValues);
      await app.model('userServices').create({
        provider: 'local',
        provider_id: email,
        userId: user.userId,
        data: { password: bcrypt.hashSync(password, 1).toString(), oldPasswords: [], isChangeRequired: true },
      });
      users[key].userId = user.userId;
    }
  });

  afterEach(() => {
    delete (config as any).allowIdentificationTypes;
    delete (config as any).allowEdrpou;
    delete (config as any).allowRnokpp;
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  it('issues a code to an allowed user', async () => {
    const agent = await startFlow('allowed');

    expectCode(await agent.get('/authorise/continue').redirects(0));
  });

  it('denies a user blocked after the session was established and issues no code', async () => {
    const agent = await startFlow('blocked');
    await app.model('user').update({ isActive: false }, { where: { userId: users.blocked.userId } });
    const before = await codeCount();

    expectNoCode(await agent.get('/authorise/continue').redirects(0), 403);

    expect(await codeCount()).toBe(before);
  });

  it('uses the current policy state, not the one at login', async () => {
    const agent = await startFlow('changed');
    config.allowIdentificationTypes = ['bankid'] as any;
    const before = await codeCount();

    expectNoCode(await agent.get('/authorise/continue').redirects(0), 403);

    expect(await codeCount()).toBe(before);
  });

  it('enforces a single configured allowlist', async () => {
    const agent = await startFlow('allowed');
    (config as any).allowRnokpp = ['#0000000000'];
    const before = await codeCount();

    expectNoCode(await agent.get('/authorise/continue').redirects(0), 403);
    expect(await codeCount()).toBe(before);
  });

  it('denies the POST scope approval of a blocked user', async () => {
    const agent = await startFlow('blocked');
    const response = await agent.post('/authorise/continue').send({ scope: ['email'] });

    expect(response.status).toBe(403);
  });

  it('resolves the configured default client explicitly when no client was prepared', async () => {
    const agent = await startFlow('changed', false);

    expectCode(await agent.get('/authorise/continue').redirects(0));
  });

  it('rejects an unauthenticated request', async () => {
    const response = await newAgent().get('/authorise/continue').redirects(0);

    expectNoCode(response, 302);
  });
});
