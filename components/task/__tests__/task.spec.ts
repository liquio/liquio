import { TestApp } from './test-app';
import { expectAuthRequired } from './helpers/auth_guard';

describe('Task Controller', () => {
  let app: TestApp;

  const TEST_USER_ID = '61efddaa351d6219eee0904e';

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  const mockUserAuth = (payload) => {
    app.nockId
      .get('/user/info')
      .query({ access_token: payload.authTokens.accessToken })
      .once()
      .reply(200, {
        userId: TEST_USER_ID,
        role: 'individual',
        services: {},
      });
  };

  describe('GET /tasks', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/tasks');
    });

    it('returns a list of tasks for an authenticated user', async () => {
      const { jwt, payload } = app.generateUserToken(TEST_USER_ID);
      mockUserAuth(payload);

      await app
        .request()
        .get('/tasks')
        .set('token', jwt)
        .expect(200)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
        });
    });
  });

  describe('GET /tasks/:id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/tasks/:id');
    });
  });

  describe('GET /tasks/:id/last', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/tasks/:id/last');
    });
  });

  describe('GET /tasks/unread/count', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/tasks/unread/count');
    });
  });

  describe('POST /tasks/get-user-performer-tasks', () => {
    it('requires basic auth credentials', async () => {
      await app.request().post('/tasks/get-user-performer-tasks').expect(401);
    });
  });

  describe('POST /tasks', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/tasks');
    });
  });

  describe('POST /tasks/by-other-system', () => {
    it('requires basic auth credentials', async () => {
      await app.request().post('/tasks/by-other-system').expect(401);
    });
  });

  describe('POST /tasks/:id/commit', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/tasks/:id/commit');
    });
  });

  describe('POST /tasks/:id/assign', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/tasks/:id/assign');
    });
  });

  describe('DELETE /tasks/expired-drafts', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'delete', '/tasks/expired-drafts');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'delete', '/tasks/:id');
    });
  });

  describe('DELETE /tasks/:id/permanent', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'delete', '/tasks/:id/permanent');
    });
  });

  describe('POST /tasks/:id/recover', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/tasks/:id/recover');
    });
  });

  describe('PUT /tasks/:id/signers', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'put', '/tasks/:id/signers');
    });
  });

  describe('PUT /tasks/:id/performers', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'put', '/tasks/:id/performers');
    });
  });

  describe('PUT /tasks/:id/due-date', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'put', '/tasks/:id/due-date');
    });
  });

  describe('PUT /tasks/:id/meta', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'put', '/tasks/:id/meta');
    });
  });

  describe('PUT /tasks/:id/signers/requests', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'put', '/tasks/:id/signers/requests');
    });
  });

  describe('POST /tasks/:id/signers/apply', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/tasks/:id/signers/apply');
    });
  });

  describe('GET /tasks/last/:workflowId/:taskTemplateId', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/tasks/last/:workflowId/:taskTemplateId');
    });
  });

  describe('POST /tasks/statistics/get-by-unit-id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/tasks/statistics/get-by-unit-id');
    });
  });

  describe('POST /tasks/list/get-by-unit-id', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'post', '/tasks/list/get-by-unit-id');
    });
  });
});
