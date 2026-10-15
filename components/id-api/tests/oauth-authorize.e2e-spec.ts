import bcrypt from 'bcrypt';
import supertest from 'supertest';

import { TestApp, config } from './test_app';

describe('AuthController - OAuth authorization', () => {
  const REGISTERED_URI = 'http://test-client-site';
  const ATTACKER_URI = 'https://attacker.example/';
  const email = 'oauth-user@email';
  const password = 'V4l!dPassW0rd';
  let app: TestApp;

  const authorise = (agent: supertest.Agent, params: Record<string, string>) =>
    agent.get('/authorise').query({ client_id: 'liquio-portal', state: 'st', redirect_uri: REGISTERED_URI, ...params });

  async function loggedInAgent(): Promise<supertest.Agent> {
    const agent = supertest.agent(`http://localhost:${config.port}`);
    await agent.post('/authorise/local').send({ email, password }).expect(200);
    return agent;
  }

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();

    config.redis.isEnabled = true;
    config.auth_providers.local = { isEnabled: true };
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };

    app = await TestApp.setup();

    const user = await app
      .model('user')
      .create({ ipn: '#1234567891', provider: 'local', email }, { returning: true })
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

  it('should reject an unknown client', async () => {
    const agent = await loggedInAgent();

    await authorise(agent, { client_id: 'unknown-client' }).redirects(0).expect(400);
  });

  it('should reject response_type=token', async () => {
    const agent = await loggedInAgent();

    const response = await authorise(agent, { response_type: 'token' }).redirects(0).expect(400);

    expect(response.headers.location).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('access_token');
  });

  it('should reject an unregistered redirect_uri', async () => {
    const agent = await loggedInAgent();

    await authorise(agent, { redirect_uri: ATTACKER_URI }).redirects(0).expect(400);
    await authorise(agent, { redirect_uri: `${REGISTERED_URI}.attacker.example` })
      .redirects(0)
      .expect(400);
  });

  it('should deliver the code to the registered redirect_uri', async () => {
    const agent = await loggedInAgent();

    await authorise(agent, { response_type: 'code' }).redirects(0).expect(302);
    const response = await agent.get('/authorise/continue').redirects(0).expect(302);

    const url = new URL(response.headers.location);
    expect(url.origin).toBe(REGISTERED_URI);
    expect(url.searchParams.get('code')).toMatch(/^[a-f0-9]{64}$/);
    expect(url.searchParams.get('state')).toBe('st');
    expect(url.searchParams.has('access_token')).toBe(false);
  });

  it('should ignore a forged redirect_uri on the continue request', async () => {
    const agent = await loggedInAgent();

    await authorise(agent, { response_type: 'code' }).redirects(0).expect(302);
    const response = await agent.get('/authorise/continue').query({ redirect_uri: ATTACKER_URI }).redirects(0).expect(302);

    const url = new URL(response.headers.location);
    expect(url.origin).toBe(REGISTERED_URI);
    expect(response.headers.location).not.toContain('attacker');
    expect(url.searchParams.has('access_token')).toBe(false);
  });

  it('should not issue an access token for a forged continue request without an authorization session', async () => {
    const agent = await loggedInAgent();

    const response = await agent.get('/authorise/continue').query({ redirect_uri: ATTACKER_URI, response_type: 'token' }).redirects(0);

    expect(response.headers.location ?? '').not.toContain('attacker');
    expect(response.headers.location ?? '').not.toContain('access_token');
  });
});
