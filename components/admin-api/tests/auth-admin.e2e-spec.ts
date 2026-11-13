import * as jsonwebtoken from 'jsonwebtoken';

import { TestApp } from './test-app';
import { prepareFixtures } from './fixtures';
import { asAdmin, grantAllAdminUnits } from './fixtures/auth';
import { getConfig } from '../src/lib/context';

const ID_API = 'http://id-api:8100';
const LOGIN_USER_ID = 'eeeeeeeeeeeeeeeeeeeeee01';

describe('Auth controller', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await prepareFixtures(app);
    await grantAllAdminUnits(app);
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

  describe('POST /auth/login', () => {
    it('answers 401 when id-api does not return tokens', async () => {
      app.nock(ID_API).post('/oauth/token/').reply(200, {});
      await app.request().post('/auth/login').send({ code: 'bad-code' }).expect(401);
    });

    it('answers 401 when id-api fails', async () => {
      app.nock(ID_API).post('/oauth/token/').reply(500, { error: 'boom' });
      await app.request().post('/auth/login').send({ code: 'bad-code' }).expect(401);
    });

    it('answers 401 when the user info cannot be loaded', async () => {
      app.nock(ID_API).post('/oauth/token/').reply(200, { access_token: 'at', refresh_token: 'rt' });
      app.nock(ID_API).get('/user/info').query(true).reply(200, {});
      await app.request().post('/auth/login').send({ code: 'code-1' }).expect(401);
    });

    it('issues a JWT and claims the unit memberships requested by IPN', async () => {
      await app.model('unit').create({
        id: 6001,
        parent_id: null,
        based_on: [],
        name: 'Login unit',
        description: 'Unit with pending members',
        members: [],
        heads: [],
        data: {},
        menu_config: {},
        allow_tokens: [],
        heads_ipn: ['2000000001'],
        members_ipn: ['2000000001'],
        requested_members: [{ ipn: '2000000001', firstName: 'Login', middleName: 'Test', lastName: 'User' }],
      });

      app.nock(ID_API).post('/oauth/token/').reply(200, { access_token: 'access-1', refresh_token: 'refresh-1' });
      app
        .nock(ID_API)
        .get('/user/info')
        .query({ access_token: 'access-1' })
        .reply(200, {
          userId: LOGIN_USER_ID,
          ipn: '2000000001',
          role: 'admin',
          first_name: 'Login',
          middle_name: 'Test',
          last_name: 'User',
          services: { eds: { data: { pem: 'PEM' } } },
        });

      const response = await app.request().post('/auth/login').send({ code: 'code-2', code_verifier: 'verifier' }).expect(200);
      const decoded: any = jsonwebtoken.verify(response.body.data.token, getConfig().auth.jwtSecret);
      expect(decoded.userId).toBe(LOGIN_USER_ID);
      expect(decoded.authTokens).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' });

      const unit = await app.model('unit').findByPk(6001);
      expect(unit.members).toContain(LOGIN_USER_ID);
      expect(unit.heads).toContain(LOGIN_USER_ID);
      expect(unit.heads_ipn).toEqual([]);
      expect(unit.members_ipn).toEqual([]);
      expect(unit.requested_members).toEqual([]);
    });

    it('flags requested members whose name does not match the id-api profile', async () => {
      await app.model('unit').create({
        id: 6002,
        parent_id: null,
        based_on: [],
        name: 'Mismatch unit',
        description: 'Unit with a mismatching request',
        members: [],
        heads: [],
        data: {},
        menu_config: {},
        allow_tokens: [],
        heads_ipn: [],
        members_ipn: [],
        requested_members: [{ ipn: '2000000002', firstName: 'Someone', middleName: 'Else', lastName: 'Entirely' }],
      });

      app.nock(ID_API).post('/oauth/token/').reply(200, { access_token: 'access-2', refresh_token: 'refresh-2' });
      app.nock(ID_API).get('/user/info').query({ access_token: 'access-2' }).reply(200, {
        userId: LOGIN_USER_ID,
        ipn: '2000000002',
        role: '',
        first_name: 'Login',
        middle_name: 'Test',
        last_name: 'User',
        services: {},
      });

      await app.request().post('/auth/login').send({ code: 'code-3' }).expect(200);
      const unit = await app.model('unit').findByPk(6002);
      expect(unit.requested_members[0]).toMatchObject({ ipn: '2000000002', wrongUserInfo: true });
    });

    it('sets up the first user as admin when the admin units are empty', async () => {
      for (const id of getConfig().user.adminUnitId) {
        await app.model('unit').update({ members: [], heads: [] }, { where: { id } });
      }

      app.nock(ID_API).post('/oauth/token/').reply(200, { access_token: 'access-3', refresh_token: 'refresh-3' });
      app
        .nock(ID_API)
        .get('/user/info')
        .query({ access_token: 'access-3' })
        .reply(200, { userId: LOGIN_USER_ID, ipn: '2000000003', role: 'user', services: {} });
      app
        .nock(ID_API)
        .post('/user/info/id')
        .optionally()
        .reply(200, [{ userId: LOGIN_USER_ID, name: 'Login User' }]);
      app.nock(ID_API).put(`/user/info/${LOGIN_USER_ID}`).reply(200, 'ok');

      await app.request().post('/auth/login').send({ code: 'code-4' }).expect(200);
      const unit = await app.model('unit').findByPk(getConfig().user.adminUnitId[0]);
      expect(unit.members).toContain(LOGIN_USER_ID);

      await grantAllAdminUnits(app);
    });
  });

  describe('authentication middleware', () => {
    it('rejects a request without a token', async () => {
      const response = await app.request().get('/auth/me').expect(401);
      expect(response.body.error.message).toEqual(expect.any(String));
    });

    it('rejects a malformed or foreign JWT', async () => {
      await app.request().get('/auth/me').set('token', 'not-a-jwt').expect(401);
      const foreign = jsonwebtoken.sign({ userId: 'x', authTokens: { accessToken: 'a', refreshToken: 'b' } }, 'another-secret');
      await app.request().get('/auth/me').set('token', foreign).expect(401);
    });

    it('rejects a JWT that has expired', async () => {
      const expired = jsonwebtoken.sign({ userId: 'x', authTokens: { accessToken: 'a', refreshToken: 'b' } }, getConfig().auth.jwtSecret, {
        expiresIn: -10,
      });
      await app.request().get('/auth/me').set('token', expired).expect(401);
    });

    it('rejects when id-api does not return the user', async () => {
      const { jwt, payload } = app.generateUserToken('ffffffffffffffffffffff01');
      app.nock(ID_API).get('/user/info').query({ access_token: payload.authTokens.accessToken }).reply(200, {});
      await app.request().get('/auth/me').set('token', jwt).expect(401);
    });

    it('rejects when id-api is unreachable', async () => {
      const { jwt, payload } = app.generateUserToken('ffffffffffffffffffffff01');
      app.nock(ID_API).get('/user/info').query({ access_token: payload.authTokens.accessToken }).reply(500, {});
      await app.request().get('/auth/me').set('token', jwt).expect(401);
    });

    it('rejects a user without an admin role', async () => {
      const userId = 'ffffffffffffffffffffff03';
      const { jwt, payload } = app.generateUserToken(userId);
      app.nock(ID_API).get('/user/info').query({ access_token: payload.authTokens.accessToken }).reply(200, { userId, role: 'user', services: {} });
      await app.request().get('/auth/me').set('token', jwt).expect(403);
    });

    it('rejects an admin that is not a member of a required unit', async () => {
      await asAdmin(app, 'get', '/users', 'ffffffffffffffffffffff04').expect(403);
    });

    it('lets OPTIONS requests through', async () => {
      const response = await app.request().options('/auth/me');
      expect(response.status).toBeLessThan(400);
    });
  });

  describe('GET /auth/me', () => {
    it('returns the profile with roles and units', async () => {
      const response = await asAdmin(app, 'get', '/auth/me').expect(200);
      expect(response.body.data.userId).toBeDefined();
      expect(response.body.data.authUserUnitIds).toBeDefined();
    });
  });

  describe('POST /local/change_password', () => {
    it('requires both passwords', async () => {
      const response = await asAdmin(app, 'post', '/local/change_password').send({ oldPassword: 'old' }).expect(400);
      expect(response.body.error.message).toBe('Old and new passwords are required.');
    });

    it('changes the password through id-api', async () => {
      app.nock(ID_API).post('/authorise/local/change_password').reply(200, { success: true, message: 'Done.' });
      const response = await asAdmin(app, 'post', '/local/change_password')
        .send({ oldPassword: 'old-pass-1', newPassword: 'new-pass-2' })
        .expect(200);
      expect(response.body.data).toEqual({ success: true, message: 'Done.' });
    });

    it('relays the id-api failure', async () => {
      app.nock(ID_API).post('/authorise/local/change_password').reply(200, { success: false, error: 'Wrong password.' });
      const response = await asAdmin(app, 'post', '/local/change_password')
        .send({ oldPassword: 'old-pass-1', newPassword: 'new-pass-2' })
        .expect(400);
      expect(response.body.error.message).toBe('Wrong password.');
    });
  });

  describe('redirects', () => {
    it('redirects to the id-api authorise page', async () => {
      const response = await app.request().get('/redirect/auth').query({ state: 'abc' }).expect(302);
      expect(response.headers.location).toContain('/authorise?');
      expect(response.headers.location).toContain('state=abc');
      expect(response.headers.location).toContain('client_id=');
    });

    it('redirects to the id-api logout page', async () => {
      const response = await app.request().get('/redirect/logout').expect(302);
      expect(response.headers.location).toContain('/logout?redirect_uri=');
    });
  });
});
