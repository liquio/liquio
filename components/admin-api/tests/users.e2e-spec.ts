import { TestApp } from './test-app';
import { prepareFixtures } from './fixtures';
import { asAdmin, grantAllAdminUnits } from './fixtures/auth';
import { getConfig } from '../src/lib/context';

const ID_API = 'http://id-api:8100';
const NOTIFIER = 'http://notification:8080';
const USER_ID = 'bbbbbbbbbbbbbbbbbbbbbb01';
const LIMITED_USER = 'dddddddddddddddddddddd01';

const idUser = (overrides = {}) => ({
  userId: USER_ID,
  first_name: 'Test',
  last_name: 'Person',
  email: 'person@example.com',
  ipn: '3000000001',
  role: '',
  isActive: true,
  services: {},
  ...overrides,
});

describe('Users controller', () => {
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

  describe('access control', () => {
    it('requires authentication', async () => {
      await app.request().get('/users').expect(401);
    });

    it('requires the security admin unit', async () => {
      await asAdmin(app, 'get', '/users', LIMITED_USER).expect(403);
      await asAdmin(app, 'post', `/users/${USER_ID}/block`, LIMITED_USER).expect(403);
    });
  });

  describe('reading', () => {
    it('lists users with their unit memberships', async () => {
      app.nock(ID_API).get('/user').query(true).reply(200, [idUser()], { total: '1' });
      const response = await asAdmin(app, 'get', '/users').query({ search: 'Test', limit: 10, offset: 0 }).expect(200);
      expect(response.body.data[0].userId).toBe(USER_ID);
      expect(response.body.data[0].units).toEqual({ heads: [], members: [], all: [] });
    });

    it('returns an empty page when id-api finds nothing', async () => {
      app.nock(ID_API).get('/user').query(true).reply(200, [], { total: '0' });
      const response = await asAdmin(app, 'get', '/users').expect(200);
      expect(response.body.data).toEqual([]);
    });

    it('returns an error when id-api fails', async () => {
      app.nock(ID_API).get('/user').query(true).reply(500, { error: 'down' });
      await asAdmin(app, 'get', '/users').expect(500);
    });

    it('finds a user by id and answers 404 when it is missing', async () => {
      app.nock(ID_API).get(`/user/${USER_ID}`).reply(200, idUser());
      const found = await asAdmin(app, 'get', `/users/${USER_ID}`).expect(200);
      expect(found.body.data.userId).toBe(USER_ID);

      app.nock(ID_API).get('/user/missing-user').reply(404, {});
      await asAdmin(app, 'get', '/users/missing-user').expect(404);
    });
  });

  describe('search', () => {
    it('searches by text, ids and IPN code', async () => {
      app.nock(ID_API).post('/user/info/search').reply(200, [idUser()]);
      app
        .nock(ID_API)
        .post('/user/info/id')
        .query(true)
        .reply(200, [idUser({ userId: 'bbbbbbbbbbbbbbbbbbbbbb02' })]);
      app
        .nock(ID_API)
        .post('/user/info/ipn')
        .reply(200, [idUser({ userId: 'bbbbbbbbbbbbbbbbbbbbbb03' })]);

      const response = await asAdmin(app, 'post', '/users/search')
        .query({ brief_info: true })
        .send({ search: 'Test', ids: ['bbbbbbbbbbbbbbbbbbbbbb02'], code: '3000000001' })
        .expect(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('requires authentication and validates the body', async () => {
      await app.request().post('/users/search').send({ search: 'x' }).expect(401);
      await asAdmin(app, 'post', '/users/search').send({ ids: 'not-an-array' }).expect(422);
    });
  });

  describe('updating', () => {
    it('updates the profile', async () => {
      app.nock(ID_API).put(`/user/info/${USER_ID}`).reply(200, 'ok');
      await asAdmin(app, 'put', `/users/${USER_ID}`).send({ isActive: true, role: 'admin' }).expect(202);
    });

    it('reports a failed update', async () => {
      app.nock(ID_API).put(`/user/info/${USER_ID}`).reply(200, 'failed');
      const response = await asAdmin(app, 'put', `/users/${USER_ID}`).send({ isActive: true });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('blocks and unblocks a user and logs them out', async () => {
      app.nock(ID_API).put(`/user/info/${USER_ID}`).reply(200, 'ok');
      app.nock(ID_API).post(`/user/${USER_ID}/logout`).reply(200, {});
      await asAdmin(app, 'post', `/users/${USER_ID}/block`).expect(202);

      app.nock(ID_API).put(`/user/info/${USER_ID}`).reply(200, 'ok');
      app.nock(ID_API).post(`/user/${USER_ID}/logout`).reply(200, {});
      await asAdmin(app, 'post', `/users/${USER_ID}/unblock`).expect(202);
    });

    it('reports a block that did not succeed', async () => {
      app.nock(ID_API).put(`/user/info/${USER_ID}`).reply(500, {});
      const response = await asAdmin(app, 'post', `/users/${USER_ID}/block`);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('sets and unsets the admin role and records the access history', async () => {
      app
        .nock(ID_API)
        .get(`/user/${USER_ID}`)
        .reply(200, idUser({ role: '' }));
      app.nock(ID_API).put(`/user/info/${USER_ID}`).reply(200, 'ok');
      app.nock(ID_API).post(`/user/${USER_ID}/logout`).reply(200, {});
      await asAdmin(app, 'post', `/users/${USER_ID}/set-admin`).send({ isCurrentAuthClient: true }).expect(202);

      app
        .nock(ID_API)
        .get(`/user/${USER_ID}`)
        .reply(200, idUser({ role: 'admin' }));
      await asAdmin(app, 'post', `/users/${USER_ID}/set-admin`).expect(202);

      app
        .nock(ID_API)
        .get(`/user/${USER_ID}`)
        .reply(200, idUser({ role: 'admin' }));
      app.nock(ID_API).put(`/user/info/${USER_ID}`).reply(200, 'ok');
      app.nock(ID_API).post(`/user/${USER_ID}/logout`).reply(200, {});
      await asAdmin(app, 'post', `/users/${USER_ID}/unset-admin`).expect(202);

      app
        .nock(ID_API)
        .get(`/user/${USER_ID}`)
        .reply(200, idUser({ role: '' }));
      await asAdmin(app, 'post', `/users/${USER_ID}/unset-admin`).expect(202);

      const history = await app.model('accessHistory').findAll({ where: { user_id: USER_ID } });
      expect(history.map((h) => h.operation_type)).toEqual(expect.arrayContaining(['added-to-admin', 'deleted-from-admin']));
    });

    it('does not change roles of an unknown user', async () => {
      app.nock(ID_API).get('/user/unknown-user').reply(404, {});
      const response = await asAdmin(app, 'post', '/users/unknown-user/set-admin');
      expect(response.status).toBeGreaterThanOrEqual(400);

      app.nock(ID_API).get('/user/unknown-user').reply(404, {});
      const unset = await asAdmin(app, 'post', '/users/unknown-user/unset-admin');
      expect(unset.status).toBeGreaterThanOrEqual(400);
    });

    it('forbids assigning admin to test users when it is disabled', async () => {
      const previous = getConfig().user.allowSetAdminTestUser;
      getConfig().user.allowSetAdminTestUser = false;
      try {
        app
          .nock(ID_API)
          .get(`/user/${USER_ID}`)
          .reply(200, idUser({ role: '', ipn: '1234567890' }));
        const response = await asAdmin(app, 'post', `/users/${USER_ID}/set-admin`);
        expect(response.status).toBe(403);
      } finally {
        getConfig().user.allowSetAdminTestUser = previous;
      }
    });

    it('sets a password', async () => {
      app.nock(ID_API).post('/user/password/set').reply(200, { success: true });
      const response = await asAdmin(app, 'post', `/users/${USER_ID}/set-password`).send({ password: 'Newpass-123' }).expect(200);
      expect(response.body).toEqual({ success: true });
      await asAdmin(app, 'post', `/users/${USER_ID}/set-password`).send({}).expect(422);
    });
  });

  describe('two factor authentication', () => {
    it('enforces 2FA', async () => {
      app.nock(ID_API).get(`/user/${USER_ID}`).reply(200, idUser());
      app.nock(ID_API).put(`/user/info/${USER_ID}`).reply(200, 'ok');
      const response = await asAdmin(app, 'post', `/users/${USER_ID}/enforce-2fa`).expect(200);
      expect(response.body.data).toEqual({ success: true });
    });

    it('reports 2FA that is already enforced or a missing user', async () => {
      app
        .nock(ID_API)
        .get(`/user/${USER_ID}`)
        .reply(200, idUser({ useTwoFactorAuth: true }));
      const already = await asAdmin(app, 'post', `/users/${USER_ID}/enforce-2fa`).expect(200);
      expect(already.body.data.error).toContain('already enabled');

      app.nock(ID_API).get('/user/nobody').reply(404, {});
      const missing = await asAdmin(app, 'post', '/users/nobody/enforce-2fa').expect(200);
      expect(missing.body.data.error).toBe('User not found');
    });

    it('reports a failure to enforce 2FA', async () => {
      app.nock(ID_API).get(`/user/${USER_ID}`).reply(200, idUser());
      app.nock(ID_API).put(`/user/info/${USER_ID}`).reply(200, 'failed');
      const response = await asAdmin(app, 'post', `/users/${USER_ID}/enforce-2fa`).expect(200);
      expect(response.body.data.error).toBe('Error enabling 2FA for this user');
    });

    it('disables 2FA', async () => {
      app
        .nock(ID_API)
        .get(`/user/${USER_ID}`)
        .reply(200, idUser({ useTwoFactorAuth: true }));
      app.nock(ID_API).put(`/user/info/${USER_ID}`).reply(200, 'ok');
      const response = await asAdmin(app, 'post', `/users/${USER_ID}/disable-2fa`).expect(200);
      expect(response.body.data).toEqual({ success: true });
    });

    it('reports 2FA that is already disabled or a missing user', async () => {
      app
        .nock(ID_API)
        .get(`/user/${USER_ID}`)
        .reply(200, idUser({ useTwoFactorAuth: false }));
      const already = await asAdmin(app, 'post', `/users/${USER_ID}/disable-2fa`).expect(200);
      expect(already.body.data.error).toContain('already disabled');

      app.nock(ID_API).get('/user/nobody').reply(404, {});
      const missing = await asAdmin(app, 'post', '/users/nobody/disable-2fa').expect(200);
      expect(missing.body.data.error).toBe('User not found');
    });

    it('reports a failure to disable 2FA', async () => {
      app
        .nock(ID_API)
        .get(`/user/${USER_ID}`)
        .reply(200, idUser({ useTwoFactorAuth: true }));
      app.nock(ID_API).put(`/user/info/${USER_ID}`).reply(200, 'failed');
      const response = await asAdmin(app, 'post', `/users/${USER_ID}/disable-2fa`).expect(200);
      expect(response.body.data.error).toBe('Error disabling 2FA for this user');
    });
  });

  describe('deleting', () => {
    it('deletes a user whose IPN matches', async () => {
      app
        .nock(ID_API)
        .get(`/user/${USER_ID}`)
        .reply(200, idUser({ ipn: '3000000009' }));
      app.nock(ID_API).delete('/user').reply(200, { success: true });
      await asAdmin(app, 'delete', `/users/${USER_ID}`).send({ ipn: '3000000009' }).expect(202);
    });

    it('refuses to delete when the IPN does not match', async () => {
      app
        .nock(ID_API)
        .get(`/user/${USER_ID}`)
        .reply(200, idUser({ ipn: '3000000009' }));
      const response = await asAdmin(app, 'delete', `/users/${USER_ID}`).send({ ipn: '3000000000' });
      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe('User has not been deleted.');
    });

    it('validates the IPN', async () => {
      await asAdmin(app, 'delete', `/users/${USER_ID}`).send({}).expect(422);
    });
  });

  describe('local users', () => {
    const body = { email: 'local@example.com', password: 'Passw0rd-1', firstName: 'Local', lastName: 'User' };

    it('creates a local user', async () => {
      app.nock(ID_API).post('/user/create_local').reply(200, { userId: 'cccccccccccccccccccccc01' });
      const response = await asAdmin(app, 'post', '/users/create_local').send(body).expect(200);
      expect(response.body.userId).toBe('cccccccccccccccccccccc01');
    });

    it('relays the id-api validation error', async () => {
      app.nock(ID_API).post('/user/create_local').reply(400, { error: 'Email already used.' });
      const response = await asAdmin(app, 'post', '/users/create_local').send(body);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('validates the body', async () => {
      await asAdmin(app, 'post', '/users/create_local').send({ email: 'x@example.com' }).expect(422);
    });
  });

  describe('messages to all users (notifier)', () => {
    it('sends a message', async () => {
      app.nock(NOTIFIER).post('/message/toAll').reply(200, { createdMessageId: 15 });
      await asAdmin(app, 'post', '/users/message/to-all').send({ title: 'Title', text: 'Body' }).expect(202);
    });

    it('reports a message that was not created', async () => {
      app.nock(NOTIFIER).post('/message/toAll').reply(200, {});
      await asAdmin(app, 'post', '/users/message/to-all').send({ title: 'Title', text: 'Body' }).expect(500);
    });

    it('validates the message', async () => {
      await asAdmin(app, 'post', '/users/message/to-all').send({ title: 'Title' }).expect(422);
    });

    it('lists and deletes messages', async () => {
      app
        .nock(NOTIFIER)
        .get('/message/toAll')
        .query(true)
        .reply(200, { data: [{ id: 15 }] });
      const list = await asAdmin(app, 'get', '/users/message/to-all').query({ start: 0, count: 5 }).expect(200);
      expect(list.body).toBeDefined();

      app.nock(NOTIFIER).delete('/message/toAll/15').reply(200, {});
      await asAdmin(app, 'delete', '/users/message/to-all/15').expect(200);
    });
  });

  describe('login history, admin actions and statistics', () => {
    it('proxies login history and admin actions from id-api', async () => {
      app
        .nock(ID_API)
        .get('/login_history')
        .query(true)
        .reply(200, { data: [{ id: 1 }], pagination: { total: 1 } });
      const history = await asAdmin(app, 'get', '/login-history').query({ page: 1, count: 10 }).expect(200);
      expect(history.body.data).toBeDefined();

      app
        .nock(ID_API)
        .get('/user_admin_actions')
        .query(true)
        .reply(200, { data: [{ id: 1 }], pagination: { total: 1 } });
      const actions = await asAdmin(app, 'get', '/user-admin-actions').expect(200);
      expect(actions.body.data).toBeDefined();
    });

    it('reports id-api failures for the history endpoints', async () => {
      app.nock(ID_API).get('/login_history').query(true).reply(500, {});
      await asAdmin(app, 'get', '/login-history').expect(500);
    });

    it('builds statistics for a date', async () => {
      app
        .nock(ID_API)
        .persist()
        .get(/^\/stat\/.*/)
        .reply(200, { new_users: 2, on_board_users: 1, login_count: 3 });
      const response = await asAdmin(app, 'get', '/stat/2026-01-15');
      app.nock(ID_API).persist(false);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('rejects a malformed statistics date', async () => {
      const response = await asAdmin(app, 'get', '/stat/not-a-date');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
