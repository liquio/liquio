import bcrypt from 'bcrypt';
import supertest from 'supertest';

import { TestApp, config } from './test_app';

describe('AuthController - OAuth authorization', () => {
  const REGISTERED_URI = 'http://test-client-site';
  const ATTACKER_URI = 'https://attacker.example/';
  const email = 'oauth-user@email';
  const password = 'V4l!dPassW0rd';
  const SECRET_CLIENT = { id: 'secret-client', secret: 'secret-client-s3cret' };
  const CREDENTIALS_CLIENT = { id: 'credentials-client', secret: 'credentials-client-s3cret' };
  let app: TestApp;

  const authorise = (agent: supertest.Agent, params: Record<string, string>) =>
    agent.get('/authorise').query({ client_id: 'liquio-portal', state: 'st', redirect_uri: REGISTERED_URI, ...params });

  async function loggedInAgent(): Promise<supertest.Agent> {
    const agent = supertest.agent(`http://localhost:${config.port}`);
    await agent.post('/authorise/local').send({ email, password }).expect(200);
    return agent;
  }

  // Runs the browser part of the authorization code flow and returns the issued code.
  async function issueCode(params: Record<string, string> = {}): Promise<string> {
    const agent = await loggedInAgent();
    await authorise(agent, { response_type: 'code', ...params })
      .redirects(0)
      .expect(302);
    const response = await agent.get('/authorise/continue').redirects(0).expect(302);
    return new URL(response.headers.location).searchParams.get('code')!;
  }

  const tokenRequest = (params: Record<string, string>) => app.request().post('/oauth/token').type('form').send(params);

  // The token endpoint requires a client_secret for every client; it is only verified when the client has `need_secret`.
  const PUBLIC_CLIENT = { id: 'liquio-portal', secret: 'not-verified' };

  const exchangeCode = (code: string, client: { id: string; secret?: string } = PUBLIC_CLIENT, extra: Record<string, string> = {}) =>
    tokenRequest({
      grant_type: 'authorization_code',
      code,
      client_id: client.id,
      ...(client.secret && { client_secret: client.secret }),
      ...extra,
    });

  const refreshTokens = (refreshToken: string, client: { id: string; secret?: string }) =>
    tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: client.id, client_secret: client.secret! });

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

    await app.model('client').create({
      clientId: SECRET_CLIENT.id,
      secret: SECRET_CLIENT.secret,
      need_secret: true,
      redirectUri: [REGISTERED_URI],
      grants: ['authorization_code', 'refresh_token'],
      scope: [],
      client_name: 'Confidential client',
      need_scope_approve: false,
    });
    // Grants that the library knows but the id-api model does not implement.
    await app.model('client').create({
      clientId: CREDENTIALS_CLIENT.id,
      secret: CREDENTIALS_CLIENT.secret,
      need_secret: true,
      redirectUri: [REGISTERED_URI],
      grants: ['client_credentials', 'password', 'implicit'],
      scope: [],
      client_name: 'Credentials client',
      need_scope_approve: false,
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

  const countAccessTokens = () => app.model('accessToken').count();

  // The access token must never be delivered through the query or the fragment of a redirect.
  const expectNoAccessTokenInLocation = (location?: string) => {
    expect(location ?? '').not.toContain('access_token');
  };

  it('should reject response_type=token', async () => {
    const agent = await loggedInAgent();
    const before = await countAccessTokens();

    const response = await authorise(agent, { response_type: 'token' }).redirects(0).expect(400);

    expect(response.headers.location).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('access_token');
    expect(await countAccessTokens()).toBe(before);
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
    const before = await countAccessTokens();

    const response = await agent.get('/authorise/continue').query({ redirect_uri: ATTACKER_URI, response_type: 'token' }).redirects(0);

    expect(response.headers.location ?? '').not.toContain('attacker');
    expectNoAccessTokenInLocation(response.headers.location);
    expect(await countAccessTokens()).toBe(before);
  });

  it('should not issue an access token for a forged response_type=token continue request after a code authorise', async () => {
    const agent = await loggedInAgent();
    await authorise(agent, { response_type: 'code' }).redirects(0).expect(302);
    const before = await countAccessTokens();

    const response = await agent.get('/authorise/continue').query({ redirect_uri: ATTACKER_URI, response_type: 'token' }).redirects(0);

    expect(response.headers.location ?? '').not.toContain('attacker');
    expectNoAccessTokenInLocation(response.headers.location);
    expect(await countAccessTokens()).toBe(before);
  });

  describe('authorization endpoint response types', () => {
    it('should default to the code response type', async () => {
      const agent = await loggedInAgent();

      await authorise(agent, {}).redirects(0).expect(302);
      const response = await agent.get('/authorise/continue').redirects(0).expect(302);

      expect(new URL(response.headers.location).searchParams.get('code')).toMatch(/^[a-f0-9]{64}$/);
    });

    it.each(['token', 'id_token', 'code token', 'code id_token', 'id_token token', 'none'])(
      'should reject unsupported response_type=%s without redirecting',
      async (responseType) => {
        const agent = await loggedInAgent();
        const before = await countAccessTokens();

        const response = await authorise(agent, { response_type: responseType }).redirects(0).expect(400);

        expect(response.body.error).toBe('unsupported_response_type');
        expect(response.headers.location).toBeUndefined();
        expect(JSON.stringify(response.body)).not.toContain('access_token');
        expect(await countAccessTokens()).toBe(before);
      },
    );

    it('should keep an unauthenticated user on the sign in page', async () => {
      const agent = supertest.agent(`http://localhost:${config.port}`);

      const response = await authorise(agent, { response_type: 'code' }).redirects(0).expect(302);

      expect(response.headers.location).toBe('/sign_in');
      await agent.get('/authorise/continue').redirects(0).expect(302);
    });

    it('should omit state from the redirect when the request had none', async () => {
      const agent = await loggedInAgent();

      await authorise(agent, { state: '' }).redirects(0).expect(302);
      const response = await agent.get('/authorise/continue').redirects(0).expect(302);

      const url = new URL(response.headers.location);
      expect(url.searchParams.get('code')).toMatch(/^[a-f0-9]{64}$/);
      expect(url.searchParams.has('state')).toBe(false);
    });
  });

  describe('grant_type=authorization_code', () => {
    it('should exchange the code for an access token for a public client', async () => {
      const code = await issueCode();

      const { body } = await exchangeCode(code).expect(200);

      expect(body.access_token).toEqual(expect.any(String));
      // The library issues a refresh token regardless of the client grants; the default client cannot redeem it (see the refresh_token tests).
      expect(body.refresh_token).toEqual(expect.any(String));
      expect(await app.model('accessToken').count({ where: { accessToken: body.access_token, clientId: 'liquio-portal' } })).toBe(1);
    });

    it('should accept the issued access token as a bearer token', async () => {
      const { body } = await exchangeCode(await issueCode()).expect(200);

      const response = await app.request().get('/oauth/token').set('Authorization', `Bearer ${body.access_token}`).expect(200);

      expect(response.body.access_token).toBe(body.access_token);
      await app.request().get('/oauth/token').set('Authorization', 'Bearer unknown-token').expect(401);
      await app.request().get('/oauth/token').expect(401);
    });

    it('should consume the code on first use', async () => {
      const code = await issueCode();
      await exchangeCode(code).expect(200);

      const response = await exchangeCode(code).expect(401);

      expect(response.body.access_token).toBeUndefined();
      expect(await app.model('authCode').count({ where: { code } })).toBe(0);
    });

    it('should reject an unknown code', async () => {
      await exchangeCode('0'.repeat(64)).expect(401);
    });

    it('should reject a request without a code', async () => {
      await tokenRequest({ grant_type: 'authorization_code', client_id: PUBLIC_CLIENT.id, client_secret: PUBLIC_CLIENT.secret }).expect(401);
    });

    it('should reject a request without a client_secret even for a client that does not need one', async () => {
      const code = await issueCode();

      await exchangeCode(code, { id: PUBLIC_CLIENT.id }).expect(401);

      await exchangeCode(code).expect(200);
    });

    it('should reject a code issued to another client', async () => {
      const code = await issueCode();

      const response = await exchangeCode(code, SECRET_CLIENT).expect(401);

      expect(response.body.access_token).toBeUndefined();
    });

    it('should reject an expired code', async () => {
      const code = await issueCode();
      await app.model('authCode').update({ expires: new Date(Date.now() - 1000) }, { where: { code } });

      await exchangeCode(code).expect(401);
    });

    it('should reject an unknown client', async () => {
      await exchangeCode(await issueCode(), { id: 'unknown-client', secret: 'x' }).expect(401);
    });

    it('should reject a token request that is not form encoded', async () => {
      const code = await issueCode();

      await app
        .request()
        .post('/oauth/token')
        .send({ grant_type: 'authorization_code', code, client_id: PUBLIC_CLIENT.id, client_secret: PUBLIC_CLIENT.secret })
        .expect(401);
    });

    it('should not support PKCE: a code verifier is rejected', async () => {
      const code = await issueCode({ code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM', code_challenge_method: 'S256' });

      const response = await exchangeCode(code, undefined, { code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk' }).expect(401);

      expect(response.body.access_token).toBeUndefined();
    });
  });

  describe('confidential client', () => {
    it('should issue an access and a refresh token for the correct client secret', async () => {
      const code = await issueCode({ client_id: SECRET_CLIENT.id });

      const { body } = await exchangeCode(code, SECRET_CLIENT).expect(200);

      expect(body.access_token).toEqual(expect.any(String));
      expect(body.refresh_token).toEqual(expect.any(String));
      expect(await app.model('refreshToken').count({ where: { refreshToken: body.refresh_token, clientId: SECRET_CLIENT.id } })).toBe(1);
    });

    it('should accept HTTP Basic client authentication', async () => {
      const code = await issueCode({ client_id: SECRET_CLIENT.id });

      const { body } = await app
        .request()
        .post('/oauth/token')
        .auth(SECRET_CLIENT.id, SECRET_CLIENT.secret)
        .type('form')
        .send({ grant_type: 'authorization_code', code })
        .expect(200);

      expect(body.access_token).toEqual(expect.any(String));
    });

    it('should reject a wrong client secret and keep the code usable', async () => {
      const code = await issueCode({ client_id: SECRET_CLIENT.id });

      const response = await exchangeCode(code, { id: SECRET_CLIENT.id, secret: 'wrong-secret' }).expect(401);

      expect(response.body.access_token).toBeUndefined();
      await exchangeCode(code, SECRET_CLIENT).expect(200);
    });

    it('should reject a missing client secret', async () => {
      const code = await issueCode({ client_id: SECRET_CLIENT.id });

      const response = await exchangeCode(code, { id: SECRET_CLIENT.id }).expect(401);

      expect(response.body.access_token).toBeUndefined();
    });
  });

  describe('grant_type=refresh_token', () => {
    async function issueTokens(): Promise<{ accessToken: string; refreshToken: string }> {
      const { body } = await exchangeCode(await issueCode({ client_id: SECRET_CLIENT.id }), SECRET_CLIENT).expect(200);
      return { accessToken: body.access_token, refreshToken: body.refresh_token };
    }

    it('should rotate the token pair', async () => {
      const { refreshToken } = await issueTokens();
      const accessTokensBefore = await app.model('accessToken').count({ where: { clientId: SECRET_CLIENT.id } });
      const refreshTokensBefore = await app.model('refreshToken').count({ where: { clientId: SECRET_CLIENT.id } });

      await refreshTokens(refreshToken, SECRET_CLIENT).expect(200);

      expect(await app.model('accessToken').count({ where: { clientId: SECRET_CLIENT.id } })).toBe(accessTokensBefore + 1);
      // The used refresh token is spent and replaced by a new one.
      expect(await app.model('refreshToken').count({ where: { refreshToken } })).toBe(0);
      expect(await app.model('refreshToken').count({ where: { clientId: SECRET_CLIENT.id } })).toBe(refreshTokensBefore);
    });

    it('should reject a refresh token that was already used', async () => {
      const { refreshToken } = await issueTokens();
      await refreshTokens(refreshToken, SECRET_CLIENT).expect(200);

      await refreshTokens(refreshToken, SECRET_CLIENT).expect(401);
    });

    it('should reject an unknown refresh token', async () => {
      await refreshTokens('unknown-refresh-token', SECRET_CLIENT).expect(401);
    });

    it('should reject a request without a refresh token', async () => {
      await tokenRequest({ grant_type: 'refresh_token', client_id: SECRET_CLIENT.id, client_secret: SECRET_CLIENT.secret }).expect(401);
    });

    it('should reject a wrong client secret and keep the refresh token', async () => {
      const { refreshToken } = await issueTokens();

      await refreshTokens(refreshToken, { id: SECRET_CLIENT.id, secret: 'wrong-secret' }).expect(401);

      expect(await app.model('refreshToken').count({ where: { refreshToken } })).toBe(1);
    });

    it('should reject a refresh token presented by another client', async () => {
      const { refreshToken } = await issueTokens();

      await refreshTokens(refreshToken, { id: CREDENTIALS_CLIENT.id, secret: CREDENTIALS_CLIENT.secret }).expect(401);
    });

    it('should reject the grant for a client that is not allowed to use it', async () => {
      const { body: issued } = await exchangeCode(await issueCode()).expect(200);
      const refreshToken: string = issued.refresh_token;

      const response = await refreshTokens(refreshToken, PUBLIC_CLIENT).expect(401);

      expect(response.body.access_token).toBeUndefined();
      expect(await app.model('refreshToken').count({ where: { refreshToken } })).toBe(1);
    });
  });

  describe('unsupported grant types', () => {
    const accessTokenCount = (clientId: string) => app.model('accessToken').count({ where: { clientId } });

    it('should reject client_credentials even for a client that lists it', async () => {
      const before = await accessTokenCount(CREDENTIALS_CLIENT.id);

      const response = await tokenRequest({
        grant_type: 'client_credentials',
        client_id: CREDENTIALS_CLIENT.id,
        client_secret: CREDENTIALS_CLIENT.secret,
      }).expect(401);

      expect(response.body.access_token).toBeUndefined();
      expect(await accessTokenCount(CREDENTIALS_CLIENT.id)).toBe(before);
    });

    it('should reject the password grant even for a client that lists it', async () => {
      const before = await accessTokenCount(CREDENTIALS_CLIENT.id);

      const response = await tokenRequest({
        grant_type: 'password',
        username: email,
        password,
        client_id: CREDENTIALS_CLIENT.id,
        client_secret: CREDENTIALS_CLIENT.secret,
      }).expect(401);

      expect(response.body.access_token).toBeUndefined();
      expect(await accessTokenCount(CREDENTIALS_CLIENT.id)).toBe(before);
    });

    it.each(['client_credentials', 'password'])('should reject grant_type=%s for a client that does not list it', async (grantType) => {
      const response = await tokenRequest({
        grant_type: grantType,
        username: email,
        password,
        client_id: SECRET_CLIENT.id,
        client_secret: SECRET_CLIENT.secret,
      }).expect(401);

      expect(response.body.access_token).toBeUndefined();
    });

    it.each(['implicit', 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'urn:ietf:params:oauth:grant-type:device_code', 'unknown'])(
      'should reject grant_type=%s',
      async (grantType) => {
        const before = await accessTokenCount(CREDENTIALS_CLIENT.id);

        const response = await tokenRequest({
          grant_type: grantType,
          client_id: CREDENTIALS_CLIENT.id,
          client_secret: CREDENTIALS_CLIENT.secret,
        }).expect(401);

        expect(response.body.access_token).toBeUndefined();
        expect(await accessTokenCount(CREDENTIALS_CLIENT.id)).toBe(before);
      },
    );

    it('should reject a request without grant_type', async () => {
      await tokenRequest({ client_id: SECRET_CLIENT.id, client_secret: SECRET_CLIENT.secret }).expect(401);
    });

    it('should not serve the token endpoint over GET with grant parameters', async () => {
      const response = await app
        .request()
        .get('/oauth/token')
        .query({ grant_type: 'client_credentials', client_id: CREDENTIALS_CLIENT.id, client_secret: CREDENTIALS_CLIENT.secret })
        .expect(401);

      expect(response.body.access_token).toBeUndefined();
    });
  });
});
