import nock from 'nock';
import supertest from 'supertest';

import { TestApp, config } from './test_app';

describe('AuthController - OIDC - PKCE', () => {
  let app: TestApp;
  let dexUrl: string;

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    dexUrl = TestApp.dexUrl;

    config.auth_providers = config.auth_providers || {};
    config.auth_providers.oidc = {
      dex: {
        isEnabled: true,
        issuer: dexUrl,
        clientID: 'test-oidc-client-id',
        clientSecret: 'test-oidc-secret',
        callbackURL: `http://localhost:${config.port}/authorise/oidc/dex/callback`,
        usePKCE: true,
      },
    };
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };

    app = await TestApp.setup();
  });

  afterAll(async () => {
    if (app) {
      await app.destroy();
    }
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should complete the PKCE authorization flow', async () => {
    const appClient = supertest.agent(`http://localhost:${config.port}`);

    const initialResponse = await appClient.get('/authorise/oidc/dex').redirects(0).expect(302);
    const authorizationUrl = new URL(initialResponse.headers.location);

    expect(authorizationUrl.origin).toBe(dexUrl);
    expect(authorizationUrl.searchParams.get('code_challenge')).toBeDefined();
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256');

    const state = authorizationUrl.searchParams.get('state');
    expect(state).toBeDefined();

    let observedCodeVerifier: string | undefined;

    nock(dexUrl)
      .post('/token')
      .reply((_, requestBody) => {
        const bodyText = typeof requestBody === 'string' ? requestBody : String(requestBody);
        const params = new URLSearchParams(bodyText);
        observedCodeVerifier = params.get('code_verifier') || undefined;

        return [200, {
          access_token: 'access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        }];
      });

    nock(dexUrl)
      .get('/userinfo')
      .reply(200, {
        sub: 'user-123',
        email: 'testuser@example.com',
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
      });

    const callbackResponse = await appClient
      .get(`/authorise/oidc/dex/callback?code=fake-code&state=${state}`)
      .redirects(0)
      .expect(302);

    expect(callbackResponse.headers.location).toBe('/authorise/continue');
    expect(observedCodeVerifier).toBeDefined();
    expect(TestApp.logs.find((log) => log.type === 'oidc|dex|callback' && log.data?.status === 'success')).toBeDefined();

    const continueResponse = await appClient.get('/authorise/continue').redirects(0).expect(302);
    const continueUrl = new URL(continueResponse.headers.location);
    expect(continueUrl.origin).toBe('http://test-client-site');
    expect(continueUrl.pathname).toBe('/');
    expect(continueUrl.searchParams.get('code')).toMatch(/^[a-f0-9]{64}$/);
  });
});