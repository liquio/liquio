import { TestApp, config } from './test_app';

describe('AuthController - OIDC', () => {
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
        scope: 'openid profile email',
        userInfo: { enabled: true },
        mapping: {
          providerId: 'sub',
          email: 'email',
          first_name: 'name',
        },
      },
      dex1: {
        isEnabled: true,
        issuer: dexUrl,
        clientID: 'test-oidc-client-id',
        clientSecret: 'test-oidc-secret',
        callbackURL: `http://localhost:${config.port}/authorise/oidc/dex1/callback`,
      },
      dex2: {
        isEnabled: true,
        issuer: dexUrl,
        clientID: 'test-oidc-client-id',
        clientSecret: 'test-oidc-secret',
        callbackURL: `http://localhost:${config.port}/authorise/oidc/dex2/callback`,
      },
      'disabled-provider': {
        isEnabled: false,
        issuer: dexUrl,
        clientID: 'test-oidc-client-id',
        clientSecret: 'test-oidc-secret',
        callbackURL: `http://localhost:${config.port}/authorise/oidc/disabled-provider/callback`,
      },
      'explicit-provider': {
        isEnabled: true,
        issuer: dexUrl,
        clientID: 'test-oidc-client-id',
        clientSecret: 'test-oidc-secret',
        callbackURL: `http://localhost:${config.port}/authorise/oidc/explicit-provider/callback`,
        authorizationURL: `${dexUrl}/auth`,
        tokenURL: `${dexUrl}/token`,
        userInfoURL: `${dexUrl}/userinfo`,
      },
      'mapped-provider': {
        isEnabled: true,
        issuer: dexUrl,
        clientID: 'test-oidc-client-id',
        clientSecret: 'test-oidc-secret',
        callbackURL: `http://localhost:${config.port}/authorise/oidc/mapped-provider/callback`,
        mapping: {
          providerId: 'sub',
          email: 'email_address',
          first_name: 'given_name',
          last_name: 'family_name',
        },
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

  it('should setup OIDC provider successfully', async () => {
    const oidcInitLog = TestApp.logs.find((log) => log.type === 'oidc' && log.data?.status === 'initialized');
    expect(oidcInitLog).toBeDefined();
    expect(oidcInitLog?.data?.providers).toBe(5);
  });

  it('should fetch discovery metadata from issuer', async () => {
    const log = TestApp.logs.find((log) => log.type === 'oidc|dex|discovery');
    expect(log).toBeDefined();
    expect(log?.data?.issuer).toBe(dexUrl);
    expect(log?.data?.authorization_endpoint).toBeDefined();
    expect(log?.data?.token_endpoint).toBeDefined();
  });

  it('should redirect to OIDC provider authorization endpoint', async () => {
    const response = await app.request().get('/authorise/oidc/dex');
    expect(response.status).toBe(302);

    const redirectUrl = new URL(response.headers.location);
    expect(redirectUrl.origin).toBe(dexUrl);
    expect(redirectUrl.pathname).toContain('/auth');
    expect(redirectUrl.searchParams.get('response_type')).toBe('code');
    expect(redirectUrl.searchParams.get('client_id')).toBe('test-oidc-client-id');
    expect(redirectUrl.searchParams.get('scope')).toBe('openid profile email');
  });

  it('should initialize multiple OIDC providers simultaneously', async () => {
    const initLog = TestApp.logs.find((log) => log.type === 'oidc' && log.data?.status === 'initialized');
    expect(initLog).toBeDefined();

    const response1 = await app.request().get('/authorise/oidc/dex1');
    const response2 = await app.request().get('/authorise/oidc/dex2');
    expect(response1.status).toBe(302);
    expect(response2.status).toBe(302);
  });

  it('should skip disabled OIDC providers', async () => {
    const disabledLog = TestApp.logs.find(
      (log) => log.type === 'oidc|disabled-provider' && log.data?.status === 'disabled',
    );
    expect(disabledLog).toBeDefined();

    const response = await app.request().get('/authorise/oidc/disabled-provider');
    expect(response.status).toBe(404);
  });

  it('should resolve explicit endpoint URLs without discovery', async () => {
    const response = await app.request().get('/authorise/oidc/explicit-provider');

    expect(response.status).toBe(302);
    const redirectUrl = new URL(response.headers.location);
    expect(redirectUrl.origin).toBe(dexUrl);
  });

  it('should support custom claim mapping', async () => {
    const response = await app.request().get('/authorise/oidc/mapped-provider');

    expect(response.status).toBe(302);
  });
});