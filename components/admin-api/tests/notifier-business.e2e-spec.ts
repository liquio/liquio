import { TestApp } from './test-app';
import { asAdmin, grantAllAdminUnits } from './fixtures/auth';

const NOTIFIER = 'http://notification:8080';
const ID_API = 'http://id-api:8100';
const USER_ID = 'bbbbbbbbbbbbbbbbbbbbbb01';
const OTHER_USER_ID = 'bbbbbbbbbbbbbbbbbbbbbb02';

const TEMPLATES = [
  { template_id: 1, title: 'Welcome', type: 'email', text: 'Hello there' },
  { template_id: 2, title: 'Reminder', type: 'sms', text: 'Do not forget' },
  { template_id: 3, title: 'Goodbye', type: 'email', text: 'See you' },
];

describe('Notifier-backed routes', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
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

  describe('message templates', () => {
    it('searches and paginates the templates', async () => {
      app.nock(NOTIFIER).get('/template').query(true).reply(200, TEMPLATES);

      const response = await asAdmin(app, 'get', '/message-templates').query({ search: 'email', page: 1, count: 1 }).expect(200);

      expect(response.body.data.total).toBe(2);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].template_id).toBe(3);
    });

    it('rejects invalid pagination', async () => {
      app.nock(NOTIFIER).get('/template').query(true).reply(200, TEMPLATES);

      const response = await asAdmin(app, 'get', '/message-templates').query({ page: 0 });

      expect(response.status).toBe(400);
    });

    it('answers 500 when the notifier is unreachable', async () => {
      app.nock(NOTIFIER).get('/template').query(true).replyWithError('connect ECONNREFUSED');

      const response = await asAdmin(app, 'get', '/message-templates');

      expect(response.status).toBe(500);
    });

    it.each([
      ['post', '/message-templates', 'post', '/template', { type: 'sms', text: 'hello', title: 'Title' }],
      ['put', '/message-templates/1', 'put', '/template/1', { type: 'sms', text: 'hello', title: 'Title' }],
      ['delete', '/message-templates/1', 'delete', '/template/1', undefined],
    ])('answers 500 on %s %s when the notifier is unreachable', async (method, path, upstreamMethod, upstreamPath, body) => {
      app.nock(NOTIFIER)[upstreamMethod](upstreamPath).replyWithError('connect ECONNREFUSED');

      let request = asAdmin(app, method as any, path);
      if (body) request = request.send(body);
      const response = await request;

      expect(response.status).toBe(500);
    });

    it('answers 500 when the export cannot read the templates', async () => {
      app.nock(NOTIFIER).get('/template').query(true).replyWithError('connect ECONNREFUSED');

      const response = await asAdmin(app, 'get', '/message-templates/export').query({ 'template_ids[]': 1 });

      expect(response.status).toBe(500);
    });

    it('imports the templates through the notifier', async () => {
      app
        .nock(NOTIFIER)
        .post('/import/template', (body) => body.dataToImport.length === 1 && body.rewriteTemplateIds[0] === 2)
        .reply(200, { imported: 1 });

      const response = await asAdmin(app, 'post', '/message-templates/import')
        .query({ 'rewriteTemplateIds[]': 2 })
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify([TEMPLATES[0]]));

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ imported: 1 });
    });

    it('answers 500 when the import file is not JSON', async () => {
      const response = await asAdmin(app, 'post', '/message-templates/import').set('Content-Type', 'text/plain').send('not json');

      expect(response.status).toBe(500);
    });

    it('answers 500 when the notifier fails the import', async () => {
      app.nock(NOTIFIER).post('/import/template').replyWithError('connect ECONNREFUSED');

      const response = await asAdmin(app, 'post', '/message-templates/import')
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify([TEMPLATES[0]]));

      expect(response.status).toBe(500);
    });
  });

  describe('mass messages mailing', () => {
    const body = (overrides = {}) => ({ subject: 'Subject', full_text: 'Text', ...overrides });

    it('sends by emails and user ids and stores the mailing', async () => {
      app
        .nock(ID_API)
        .post('/user/info/id')
        .query(true)
        .reply(200, [{ userId: USER_ID, email: 'user@example.com' }]);
      app
        .nock(ID_API)
        .get('/user')
        .query(true)
        .reply(200, [{ userId: OTHER_USER_ID, email: 'other@example.com' }]);
      app.nock(NOTIFIER).post('/message/emailsList').reply(200, { sent: 1 });
      app.nock(NOTIFIER).post('/message/usersList').reply(200, { sent: 1 });

      const response = await asAdmin(app, 'post', '/mass-messages-mailing/send').send(
        body({ emails_list: ['other@example.com'], user_ids_list: [USER_ID] }),
      );

      expect(response.status).toBe(200);
      expect(response.body.data.isFinished).toBe(true);
      expect(response.body.data.responseByEmails).toEqual({ sent: 1 });

      const list = await asAdmin(app, 'get', '/mass-messages-mailing/get-list').expect(200);
      expect(list.body.data.length).toBeGreaterThan(0);
    });

    it('rejects user ids that do not exist', async () => {
      app.nock(ID_API).post('/user/info/id').query(true).reply(200, []);

      const response = await asAdmin(app, 'post', '/mass-messages-mailing/send').send(body({ user_ids_list: [USER_ID] }));

      expect(response.status).toBe(500);
      expect(response.body.error.message).toContain('not existing userIds');
    });

    it('rejects emails that do not exist', async () => {
      app.nock(ID_API).get('/user').query(true).reply(200, []);

      const response = await asAdmin(app, 'post', '/mass-messages-mailing/send').send(body({ emails_list: ['missing@example.com'] }));

      expect(response.status).toBe(500);
      expect(response.body.error.message).toContain('not existing user emails');
    });

    it('answers 500 when the id service fails', async () => {
      app.nock(ID_API).post('/user/info/id').query(true).replyWithError('connect ECONNREFUSED');

      const response = await asAdmin(app, 'post', '/mass-messages-mailing/send').send(body({ user_ids_list: [USER_ID] }));

      expect(response.status).toBe(500);
    });

    it('answers 500 when the notifier fails to send emails', async () => {
      app
        .nock(ID_API)
        .get('/user')
        .query(true)
        .reply(200, [{ userId: OTHER_USER_ID, email: 'other@example.com' }]);
      app.nock(NOTIFIER).post('/message/emailsList').replyWithError('connect ECONNREFUSED');

      const response = await asAdmin(app, 'post', '/mass-messages-mailing/send').send(body({ emails_list: ['other@example.com'] }));

      expect(response.status).toBe(500);
    });

    it('answers 500 when the notifier fails to send to user ids', async () => {
      app
        .nock(ID_API)
        .post('/user/info/id')
        .query(true)
        .reply(200, [{ userId: USER_ID, email: 'user@example.com' }]);
      app.nock(NOTIFIER).post('/message/usersList').replyWithError('connect ECONNREFUSED');

      const response = await asAdmin(app, 'post', '/mass-messages-mailing/send').send(body({ user_ids_list: [USER_ID] }));

      expect(response.status).toBe(500);
    });
  });
});
