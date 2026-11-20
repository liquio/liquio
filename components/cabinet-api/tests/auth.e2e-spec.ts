import * as jsonwebtoken from 'jsonwebtoken';
import type { Response as SupertestResponse } from 'supertest';

import { TestApp, JWT_SECRET } from './test-app';

describe('Auth', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll({ redis: true });
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  describe('token checks', () => {
    it('returns 401 when the token header is missing', async () => {
      await app
        .request()
        .get('/totp/generate')
        .expect(401)
        .expect((response: SupertestResponse) => {
          expect(response.body.error.message).toBe('Token should be defined in request headers.');
          expect(response.body).toHaveProperty('traceId');
        });
    });

    it('returns 401 for a malformed token', async () => {
      await app.request().get('/totp/generate').set('token', 'not-a-jwt').expect(401);
    });

    it('returns 401 for a token signed with another secret', async () => {
      const { payload } = app.generateUserToken();
      const jwt = jsonwebtoken.sign(payload, 'another-secret', { expiresIn: 3600 });

      await app.request().get('/totp/generate').set('token', jwt).expect(401);
    });

    it('returns 401 for an expired token', async () => {
      const { payload } = app.generateUserToken();
      const jwt = jsonwebtoken.sign({ ...payload, iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 }, JWT_SECRET);

      await app.request().get('/totp/generate').set('token', jwt).expect(401);
    });

    it('returns 401 for a token without expiration', async () => {
      const { payload } = app.generateUserToken();
      const jwt = jsonwebtoken.sign(payload, JWT_SECRET);

      await app.request().get('/totp/generate').set('token', jwt).expect(401);
    });

    it('returns 401 for a token without ID tokens inside', async () => {
      const jwt = jsonwebtoken.sign({ userId: 'test-user-1' }, JWT_SECRET, { expiresIn: 3600 });

      await app.request().get('/totp/generate').set('token', jwt).expect(401);
    });

    it('returns 401 when ID does not know the access token', async () => {
      const { jwt, payload } = app.generateUserToken();
      app.nockId.get('/user/info').query({ access_token: payload.authTokens.accessToken }).reply(401, { error: 'invalid_token' });

      await app.request().get('/totp/generate').set('token', jwt).expect(401);
    });

    it('returns 401 when ID answers without a user', async () => {
      const { jwt, payload } = app.generateUserToken();
      app.nockId.get('/user/info').query({ access_token: payload.authTokens.accessToken }).reply(200, {});

      await app.request().get('/totp/generate').set('token', jwt).expect(401);
    });
  });

  describe('valid session', () => {
    it('passes a fresh token, checks the session in ID and does not reissue the token', async () => {
      const { jwt, payload } = app.generateUserToken();
      app.mockUserInfo(payload.authTokens.accessToken);
      app.nockId.get('/totp/generate').query(true).reply(200, { secret: 'test-secret', uri: 'otpauth://test' });

      await app
        .request()
        .get('/totp/generate')
        .set('token', jwt)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual({ success: true, secret: 'test-secret', uri: 'otpauth://test' });
          expect(response.headers).not.toHaveProperty('new_token');
        });
    });

    it('reissues a stale token after the session is confirmed in ID', async () => {
      const now = Math.floor(Date.now() / 1000);
      const { payload } = app.generateUserToken();
      const jwt = jsonwebtoken.sign({ ...payload, iat: now - 3000 }, JWT_SECRET, { expiresIn: 7200 });
      app.mockUserInfo(payload.authTokens.accessToken);
      app.nockId.get('/totp/generate').query(true).reply(200, { secret: 'test-secret', uri: 'otpauth://test' });

      await app
        .request()
        .get('/totp/generate')
        .set('token', jwt)
        .expect(200)
        .expect((response: SupertestResponse) => {
          const newToken = response.headers['new_token'];
          expect(typeof newToken).toBe('string');
          const decoded = jsonwebtoken.verify(newToken, JWT_SECRET) as any;
          expect(decoded.userId).toBe('test-user-1');
          expect(decoded.authTokens).toEqual(payload.authTokens);
        });
    });

    it('answers success=false when ID fails to generate a TOTP secret', async () => {
      const { jwt, payload } = app.generateUserToken();
      app.mockUserInfo(payload.authTokens.accessToken);
      app.nockId.get('/totp/generate').query(true).reply(500, { error: 'boom' });

      await app
        .request()
        .get('/totp/generate')
        .set('token', jwt)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual({ success: false });
        });
    });
  });

  describe('user actions', () => {
    it('POST /local/change_password forwards the passwords to ID', async () => {
      const { jwt, payload } = app.generateUserToken();
      app.mockUserInfo(payload.authTokens.accessToken);
      app.nockId
        .post('/authorise/local/change_password', { email: 'user@example.test', oldPassword: 'old-pass', newPassword: 'new-pass' })
        .reply(200, { success: true, message: 'changed' });

      await app
        .request()
        .post('/local/change_password')
        .set('token', jwt)
        .send({ oldPassword: 'old-pass', newPassword: 'new-pass' })
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual({ success: true, message: 'changed' });
        });
    });

    it('POST /totp/enable and /totp/disable forward the codes to ID', async () => {
      const first = app.generateUserToken();
      app.mockUserInfo(first.payload.authTokens.accessToken);
      app.nockId.post('/totp/enable').query(true).reply(200, { success: true });
      await app
        .request()
        .post('/totp/enable')
        .set('token', first.jwt)
        .send({ secret: 'test-secret', code: '123456' })
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual({ success: true });
        });

      const second = app.generateUserToken();
      app.mockUserInfo(second.payload.authTokens.accessToken);
      app.nockId.post('/totp/disable').query(true).reply(200, { success: true });
      await app
        .request()
        .post('/totp/disable')
        .set('token', second.jwt)
        .send({ code: '123456' })
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual({ success: true });
        });
    });

    it('DELETE /user answers 400 when the deletion is not allowed', async () => {
      const { jwt, payload } = app.generateUserToken();
      app.mockUserInfo(payload.authTokens.accessToken);

      await app
        .request()
        .delete('/user')
        .set('token', jwt)
        .send({})
        .expect(400)
        .expect((response: SupertestResponse) => {
          expect(response.body.error.message).toEqual({ error: 'Method is not allowed' });
        });
    });
  });

  it('returns a JSON error for a malformed JSON body', async () => {
    const { jwt, payload } = app.generateUserToken();
    app.mockUserInfo(payload.authTokens.accessToken);

    await app
      .request()
      .post('/totp/enable')
      .set('token', jwt)
      .set('Content-Type', 'application/json')
      .send('{"broken":')
      .expect(400)
      .expect((response: SupertestResponse) => {
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('traceId');
      });
  });
});
