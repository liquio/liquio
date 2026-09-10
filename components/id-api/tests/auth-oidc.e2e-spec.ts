import { createHash } from 'crypto';
import nock from 'nock';
import supertest from 'supertest';

import { TestApp, config } from './test_app';
import { Models } from '../src/models';

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
      'ipn-mapped-provider': {
        isEnabled: true,
        issuer: dexUrl,
        clientID: 'test-oidc-client-id',
        clientSecret: 'test-oidc-secret',
        callbackURL: `http://localhost:${config.port}/authorise/oidc/ipn-mapped-provider/callback`,
        mapping: {
          first_name: 'given_name',
          last_name: 'family_name',
          ipn: 'national_id',
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
    expect(oidcInitLog?.data?.providers).toBe(6);
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
    const disabledLog = TestApp.logs.find((log) => log.type === 'oidc|disabled-provider' && log.data?.status === 'disabled');
    expect(disabledLog).toBeDefined();

    const response = await app.request().get('/authorise/oidc/disabled-provider');
    expect(response.status).toBe(503);
    expect(response.body.error).toBe('OIDC provider is disabled');
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

  describe('ipn mapping', () => {
    afterEach(() => {
      nock.cleanAll();
    });

    it('should map a provider claim to ipn when configured', async () => {
      const appClient = supertest.agent(`http://localhost:${config.port}`);
      const sub = 'ipn-mapped-user-1';

      const initialResponse = await appClient.get('/authorise/oidc/ipn-mapped-provider').redirects(0).expect(302);
      const state = new URL(initialResponse.headers.location).searchParams.get('state');

      nock(dexUrl).post('/token').reply(200, { access_token: 'access-token', token_type: 'Bearer', expires_in: 3600 });
      nock(dexUrl).get('/userinfo').reply(200, {
        sub,
        given_name: 'Erika',
        family_name: 'Mustermann',
        national_id: '1234567890',
      });

      await appClient.get(`/authorise/oidc/ipn-mapped-provider/callback?code=fake-code&state=${state}`).redirects(0).expect(302);

      const service = await Models.model('userServices')
        .findOne({ where: { provider: 'oidc-ipn-mapped-provider', provider_id: sub } })
        .then((row) => row?.dataValues);
      expect(service).toBeDefined();

      const user = await Models.model('user')
        .findOne({ where: { userId: service!.userId } })
        .then((row) => row?.dataValues);

      expect(user?.ipn).toBe('1234567890');
    });

    it('should generate a deterministic fake ipn when the provider has no ipn claim', async () => {
      const appClient = supertest.agent(`http://localhost:${config.port}`);
      const sub = 'ipn-fallback-user-1';

      const initialResponse = await appClient.get('/authorise/oidc/dex').redirects(0).expect(302);
      const state = new URL(initialResponse.headers.location).searchParams.get('state');

      nock(dexUrl).post('/token').reply(200, { access_token: 'access-token', token_type: 'Bearer', expires_in: 3600 });
      nock(dexUrl).get('/userinfo').reply(200, {
        sub,
        name: 'No Ipn User',
      });

      await appClient.get(`/authorise/oidc/dex/callback?code=fake-code&state=${state}`).redirects(0).expect(302);

      const service = await Models.model('userServices')
        .findOne({ where: { provider: 'oidc-dex', provider_id: sub } })
        .then((row) => row?.dataValues);
      expect(service).toBeDefined();

      const user = await Models.model('user')
        .findOne({ where: { userId: service!.userId } })
        .then((row) => row?.dataValues);

      const expectedIpn = `#${createHash('sha256').update(`oidc-dex:${sub}`).digest('hex')}`;
      expect(user?.ipn).toBe(expectedIpn);

      // Deterministic: a second login for the same identity keeps the same generated ipn.
      nock(dexUrl).post('/token').reply(200, { access_token: 'access-token-2', token_type: 'Bearer', expires_in: 3600 });
      nock(dexUrl).get('/userinfo').reply(200, {
        sub,
        name: 'No Ipn User',
      });

      const secondResponse = await appClient.get('/authorise/oidc/dex').redirects(0).expect(302);
      const secondState = new URL(secondResponse.headers.location).searchParams.get('state');
      await appClient.get(`/authorise/oidc/dex/callback?code=fake-code-2&state=${secondState}`).redirects(0).expect(302);

      const userAfterSecondLogin = await Models.model('user')
        .findOne({ where: { userId: service!.userId } })
        .then((row) => row?.dataValues);

      expect(userAfterSecondLogin?.ipn).toBe(expectedIpn);
    });
  });
});
