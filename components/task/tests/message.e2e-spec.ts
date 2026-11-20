import { TestApp } from './test-app';
import { HttpRequest } from '../src/lib/http_request';
import { DownloadToken } from '../src/lib/download_token';
import { expectAuthRequired } from './helpers/auth_guard';

describe('Message Controller', () => {
  let app: TestApp;

  const TEST_USER_ID = '61efddaa351d6219eee0904f';

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
      .reply(200, { userId: TEST_USER_ID, role: 'individual', services: {} });
  };

  describe('GET /messages', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/messages');
    });

    it('returns a list of messages for an authenticated user', async () => {
      const { jwt, payload } = app.generateUserToken(TEST_USER_ID);
      mockUserAuth(payload);

      await app
        .request()
        .get('/messages')
        .set('token', jwt)
        .expect(200)
        .expect((response) => {
          expect(response.body).toHaveProperty('data');
        });
    });
  });

  describe('GET /messages attachments', () => {
    it('issues attachment download tokens bound to the requesting user', async () => {
      const { jwt, payload } = app.generateUserToken(TEST_USER_ID);
      mockUserAuth(payload);
      jest.spyOn(HttpRequest, 'send').mockResolvedValue({ result: [{ id: 1, meta: { attachments: [{ fileId: 'att-1' }] } }], meta: {} } as any);

      const response = await app.request().get('/messages').set('token', jwt).expect(200);

      const { downloadToken } = response.body.data[0].meta.attachments[0];
      expect(new DownloadToken().decrypt(downloadToken, TEST_USER_ID)).toBe('att-1');
      expect(() => new DownloadToken().decrypt(downloadToken, 'another-user')).toThrow();
    });
  });

  describe('PUT /messages/state', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'put', '/messages/state');
    });
  });

  describe('PUT /messages/:id/decrypt', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'put', '/messages/:id/decrypt');
    });
  });

  describe('GET /messages/count-unread', () => {
    it('requires auth', async () => {
      await expectAuthRequired(app, 'get', '/messages/count-unread');
    });
  });
});
