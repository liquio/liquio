import bcrypt from 'bcrypt';
import supertest from 'supertest';

import { TestApp, config } from './test_app';

describe('AuthController - OAuth scope consent', () => {
  const REDIRECT = 'http://test-client-site';
  const email = 'consent-user@email';
  const password = 'V4l!dPassW0rd';
  const CONSENT = 'consent-client';
  const OTHER = 'consent-other-client';
  const AUTO = 'auto-client';
  let app: TestApp;
  let userId: string;

  const clientUsers = (clientId: string) => app.model('clientUser').findAll({ where: { userId, clientId } });
  const codesCount = () => app.model('authCode').count();

  async function agentFor(clientId: string): Promise<supertest.Agent> {
    const agent = supertest.agent(`http://localhost:${config.port}`);
    await agent.post('/authorise/local').send({ email, password }).expect(200);
    await agent.get('/authorise').query({ client_id: clientId, state: 'st', redirect_uri: REDIRECT, response_type: 'code' }).redirects(0).expect(302);
    return agent;
  }

  const decide = (agent: supertest.Agent, body: Record<string, unknown>) => agent.post('/authorise/consent').send(body);

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.redis.isEnabled = true;
    config.oauth!.enforceScopeConsent = true;
    config.auth_providers.local = { isEnabled: true };
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };
    app = await TestApp.setup();

    const user = await app
      .model('user')
      .create({ ipn: '#1234567899', provider: 'local', email }, { returning: true })
      .then((row) => row.dataValues);
    userId = user.userId;
    await app.model('userServices').create({
      provider: 'local',
      provider_id: email,
      userId,
      data: { password: bcrypt.hashSync(password, 1).toString(), oldPasswords: [], isChangeRequired: true },
    });
    for (const [clientId, need] of [
      [CONSENT, true],
      [OTHER, true],
      [AUTO, false],
    ] as const) {
      await app.model('client').create({
        clientId,
        secret: 's3cret',
        need_secret: false,
        redirectUri: [REDIRECT],
        grants: ['authorization_code'],
        scope: ['profile', 'email'],
        client_name: clientId,
        need_scope_approve: need,
      });
    }
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  it('should keep the automatic flow for a client without need_scope_approve', async () => {
    const agent = await agentFor(AUTO);
    const response = await agent.get('/authorise/continue').redirects(0).expect(302);

    expect(new URL(response.headers.location).searchParams.get('code')).toBeTruthy();
    expect((await clientUsers(AUTO))[0].dataValues.scope).toEqual(['profile', 'email']);
  });

  it('should keep the old automatic flow and hide the consent endpoints when enforceScopeConsent is off', async () => {
    config.oauth!.enforceScopeConsent = false;
    try {
      await app.model('clientUser').destroy({ where: { userId, clientId: CONSENT } });
      const agent = await agentFor(CONSENT);

      await agent.get('/authorise/consent').expect(404);
      await agent.post('/authorise/consent').send({ decision: 'approve' }).expect(404);
      const response = await agent.get('/authorise/continue').redirects(0).expect(302);
      expect(new URL(response.headers.location).searchParams.get('code')).toBeTruthy();
      expect((await clientUsers(CONSENT))[0].dataValues.scope).toEqual(['profile', 'email']);
      await app.model('clientUser').destroy({ where: { userId, clientId: CONSENT } });
    } finally {
      config.oauth!.enforceScopeConsent = true;
    }
  });

  it('should not record consent or issue a code on GET /authorise/continue', async () => {
    const agent = await agentFor(CONSENT);
    const before = await codesCount();
    const response = await agent.get('/authorise/continue').redirects(0).expect(302);

    expect(response.headers.location).toBe('/authorise/consent');
    expect(await clientUsers(CONSENT)).toHaveLength(0);
    expect(await codesCount()).toBe(before);
  });

  it('should not let the legacy POST /authorise/continue record consent', async () => {
    const agent = await agentFor(CONSENT);
    await agent
      .post('/authorise/continue')
      .send({ scope: ['profile'] })
      .expect(403);

    expect(await clientUsers(CONSENT)).toHaveLength(0);
  });

  it('should require authentication for the consent endpoints', async () => {
    const anonymous = supertest.agent(`http://localhost:${config.port}`);
    const before = await clientUsers(CONSENT);

    expect([401, 403, 302]).toContain((await anonymous.post('/authorise/consent').send({ decision: 'approve' })).status);
    expect(await clientUsers(CONSENT)).toHaveLength(before.length);
  });

  it('should reject an approval without the one-time token', async () => {
    const agent = await agentFor(CONSENT);
    await agent.get('/authorise/consent').expect(200);

    await decide(agent, { decision: 'approve' }).expect(403);
    await decide(agent, { decision: 'approve', csrf_token: 'forged' }).expect(403);
    expect(await clientUsers(CONSENT)).toHaveLength(0);
  });

  it('should store only the session scope on approval and then issue a code', async () => {
    const agent = await agentFor(CONSENT);
    const view = await agent.get('/authorise/consent').expect(200);
    expect(view.body).toMatchObject({ client_id: CONSENT, scope: ['profile', 'email'] });

    // A scope or client supplied in the POST is ignored.
    await decide(agent, { decision: 'approve', csrf_token: view.body.csrf_token, scope: ['admin'], client_id: OTHER }).expect(200);

    expect((await clientUsers(CONSENT))[0].dataValues.scope).toEqual(['profile', 'email']);
    expect(await clientUsers(OTHER)).toHaveLength(0);
    const response = await agent.get('/authorise/continue').redirects(0).expect(302);
    expect(new URL(response.headers.location).searchParams.get('code')).toBeTruthy();
  });

  it('should store nothing and issue no code on denial', async () => {
    await app.model('clientUser').destroy({ where: { userId, clientId: CONSENT } });
    const agent = await agentFor(CONSENT);
    const view = await agent.get('/authorise/consent').expect(200);
    const before = await codesCount();

    const res = await decide(agent, { decision: 'deny', csrf_token: view.body.csrf_token }).expect(200);

    const url = new URL(res.body.redirect);
    expect(url.searchParams.get('error')).toBe('access_denied');
    expect(url.searchParams.get('state')).toBe('st');
    expect(url.searchParams.has('code')).toBe(false);
    expect(await clientUsers(CONSENT)).toHaveLength(0);
    expect(await codesCount()).toBe(before);
    expect((await agent.get('/authorise/continue').redirects(0)).headers.location).toBe('/authorise/consent');
  });

  it('should not accept a token twice', async () => {
    await app.model('clientUser').destroy({ where: { userId, clientId: CONSENT } });
    const agent = await agentFor(CONSENT);
    const view = await agent.get('/authorise/consent').expect(200);
    await decide(agent, { decision: 'deny', csrf_token: view.body.csrf_token }).expect(200);

    await decide(agent, { decision: 'approve', csrf_token: view.body.csrf_token }).expect(403);
    expect(await clientUsers(CONSENT)).toHaveLength(0);
  });

  it('should not apply a token issued for another client to a re-prepared session', async () => {
    await app.model('clientUser').destroy({ where: { userId } });
    const agent = await agentFor(CONSENT);
    const view = await agent.get('/authorise/consent').expect(200);
    await agent.get('/authorise').query({ client_id: OTHER, state: 'st', redirect_uri: REDIRECT, response_type: 'code' }).redirects(0).expect(302);

    await decide(agent, { decision: 'approve', csrf_token: view.body.csrf_token }).expect(403);
    expect(await clientUsers(OTHER)).toHaveLength(0);
    expect(await clientUsers(CONSENT)).toHaveLength(0);
  });

  it('should ask for consent again when the stored scope no longer covers the request', async () => {
    await app.model('clientUser').destroy({ where: { userId, clientId: CONSENT } });
    await app.model('clientUser').create({ userId, clientId: CONSENT, scope: ['profile'] });
    const agent = await agentFor(CONSENT);

    expect((await agent.get('/authorise/continue').redirects(0)).headers.location).toBe('/authorise/consent');
    expect((await clientUsers(CONSENT))[0].dataValues.scope).toEqual(['profile']);
  });
});
