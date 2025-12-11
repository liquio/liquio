import nock from 'nock';

import { TestApp, config } from './test_app';
import wso2OpenidConfiguration from './wso2.openid-configuration.json';

describe('AuthController - wso', () => {
  let app: TestApp;
  let remoteBaseURL: string = new URL(wso2OpenidConfiguration.authorization_endpoint).origin;

  beforeAll(async () => {
    await TestApp.beforeAll();
  });

  afterAll(async () => {
    await app.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();

    // Nock the request to the well-known endpoint (must be after TestApp.beforeEach which calls nock.cleanAll())
    nock(remoteBaseURL).get('/.well-known/openid-configuration').times(10).reply(200, wso2OpenidConfiguration);
  });

  it('should setup an app successfully', async () => {
    config.auth_providers.wso2 = {
      // WSO2 provider must be enabled
      isEnabled: true,
      // Base URL for WSO2 (remote) Identity Server
      baseURL: remoteBaseURL,
      // Client ID and secret for the WSO2 application (must have a record in clients table)
      clientID: 'test-client-id',
      clientSecret: 'secret',
      // Callback URL for the WSO2 application (must match the one in clients table)
      callbackURL: 'http://localhost:8080/authorise/wso2/callback',
    };
    config.notify = { url: 'http://notify-service', authorization: 'bm90aWZ5Om5vdGlmeQ==' };

    try {
      app = await TestApp.setup();
    } catch (error: any) {
      throw new Error(`Failed to setup app: ${error.toString()}`);
    }

    expect(TestApp.logs.find((log) => log.type === 'wso2|init')?.data).toEqual({
      status: 'initialized',
    });
  });

  describe('WSO2 Authorization (oauth2)', () => {
    it('should download config details from well-known endpoint', async () => {
      const log = TestApp.logs.find((log) => log.type === 'wso2|oauth2-metadata');
      expect(log).toBeDefined();
      expect(log?.data).toEqual(wso2OpenidConfiguration);
    });

    it('should redirect to WSO2 authorization page', async () => {
      const response = await app.request().get('/authorise/wso2');
      expect(response.status).toBe(302);

      const expectedRedirectUrl = new URL(wso2OpenidConfiguration.authorization_endpoint);
      expectedRedirectUrl.searchParams.append('response_type', 'code');
      expectedRedirectUrl.searchParams.append('redirect_uri', 'http://localhost:8080/authorise/wso2/callback');
      expectedRedirectUrl.searchParams.append('client_id', 'test-client-id');
      expectedRedirectUrl.searchParams.append('scope', 'openid');

      expect(new URL(response.headers.location)).toEqual(expectedRedirectUrl);
    });

    let cookies: any;
    it('should receive a code from WSO2', async () => {
      nock(remoteBaseURL).post('/token').reply(200, {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });

      nock(remoteBaseURL).get('/userinfo').reply(200, {
        sub: 'provider-id-123',
        itin: '1234567890',
        organization_edrpou: '12345678',
        email: 'user@example.com',
        phone_number: '+1234567890',
        organization_name: 'Example Organization',
        given_name: 'John',
        family_name: 'Doe',
        middle_name: 'A',
      });

      await app
        .request()
        .get('/authorise/wso2/callback?code=123456&state=123456')
        .expect(302)
        .expect(({ headers }) => {
          expect(headers.location).toEqual('/authorise/continue');
          expect(headers['set-cookie']).toBeDefined();
          cookies = headers['set-cookie'];
        });
    });

    it('should redirect to /authorise/continue', async () => {
      const response = await app.request().get('/authorise/continue').set('Cookie', cookies);
      expect(response.status).toBe(302);
      const expectedRedirectUrl = new URL(response.headers.location);
      expect(expectedRedirectUrl.origin).toEqual('http://test-client-site');
      expect(expectedRedirectUrl.pathname).toEqual('/');
      expect(expectedRedirectUrl.searchParams.get('code')).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
