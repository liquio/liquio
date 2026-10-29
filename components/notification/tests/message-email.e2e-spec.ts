import { TestApp, TEST_AUTH_HEADER, TEST_SERVICE } from './test-app';

const ID_API = 'http://id-api:8080';

describe('Message Controller: email sending', () => {
  let app: TestApp;
  let sendMail: jest.Mock;
  let mailer: any;
  let savedEnabled: any;
  const authed = (req: any) => req.set('Authorization', TEST_AUTH_HEADER);

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    mailer = require('../src/models/emailGate/mailerModel').MailerModel;
    savedEnabled = mailer.config.isEnabled;
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    mailer.config.isEnabled = savedEnabled;
    await TestApp.afterEach();
  });

  const enableSmtp = (impl?: (options: any) => Promise<any>) => {
    mailer.config.isEnabled = true;
    sendMail = jest.fn(impl || (async (options: any) => ({ messageId: 'id-1', accepted: [options.to], rejected: [], response: '250 ok' })));
    jest.spyOn(require('nodemailer'), 'createTransport').mockReturnValue({ sendMail } as any);
  };

  describe('POST /message/emailsList', () => {
    const post = (body: any) => authed(app.request().post('/message/emailsList')).send(body);

    it('requires Basic auth and valid input', async () => {
      await app.request().post('/message/emailsList').send({}).expect(401);
      await post({}).expect(400);
      const noFull = await post({ list_email: ['a@example.test'] }).expect(400);
      expect(noFull.body.message).toBe('Full message not valid');
      const noTitle = await post({ list_email: ['a@example.test'], full_message: 'body' }).expect(400);
      expect(noTitle.body.message).toBe('Title message not valid');
    });

    it('reports skipped sending when SMTP is disabled', async () => {
      const res = await post({ list_email: ['a@example.test', 'b@example.test'], title_message: 'T', full_message: 'Body' }).expect(200);
      expect(res.body.sendByEmail).toEqual([
        { skipped: true, reason: 'SMTP is disabled in config.' },
        { skipped: true, reason: 'SMTP is disabled in config.' },
      ]);
    });

    it('sends one email with a normalized body, attachments and a custom sender', async () => {
      enableSmtp();
      const res = await post({
        list_email: ['user+tag@example.test'],
        title_message: 'Subject',
        full_message: 'Hello {{name}}<style>p{}</style> world',
        sendBy: 'Sender <sender@example.test>',
        attachments: [{ filename: 'a.txt', content: 'aGk=' }],
      }).expect(200);
      expect(res.body.sendByEmail).toMatchObject({ messageId: 'id-1' });
      const options = sendMail.mock.calls[0][0];
      expect(options).toMatchObject({
        from: 'Sender <sender@example.test>',
        to: 'user@example.test',
        subject: 'Subject',
        text: 'Hello  world',
        attachments: [{ filename: 'a.txt', content: 'aGk=', encoding: 'base64' }],
      });
    });

    it('keeps the plus tag with doNotEscapeEmail and wraps the body into a template', async () => {
      enableSmtp();
      const { TemplatesModel } = require('../src/models/templates');
      const template = await new TemplatesModel().Templates.create({ type: 'email', text: '<b>{{body}}</b>', title: 'wrap' });
      await post({
        list_email: ['user+tag@example.test'],
        title_message: 'S',
        full_message: 'inner',
        template_id: template.template_id,
        doNotEscapeEmail: true,
      }).expect(200);
      expect(sendMail.mock.calls[0][0]).toMatchObject({ to: 'user+tag@example.test', html: '<b>inner</b>' });
    });

    it('sends to several recipients and fails when one send fails', async () => {
      enableSmtp();
      const many = await post({ list_email: ['a@example.test', 'b@example.test'], title_message: 'S', full_message: 'B' }).expect(200);
      expect(many.body.sendByEmail).toHaveLength(2);
      expect(sendMail).toHaveBeenCalledTimes(2);

      sendMail.mockRejectedValue(Object.assign(new Error('smtp down'), { errorCode: 502 }));
      const res = await post({ list_email: ['a@example.test'], title_message: 'S', full_message: 'B' });
      expect(res.status).toBe(502);
    });

    it('survives a transport that can not be created', async () => {
      enableSmtp();
      jest.spyOn(require('nodemailer'), 'createTransport').mockImplementation(() => {
        throw new Error('bad config');
      });
      await post({ list_email: ['a@example.test'], title_message: 'S', full_message: 'B' });
      expect(sendMail).not.toHaveBeenCalled();
    });
  });

  describe('POST /message/test/email', () => {
    it('rejects an email that is not a configured test address', async () => {
      const res = await app
        .request()
        .post('/message/test/email')
        .set('Authorization', TEST_SERVICE.token)
        .query({ email: 'other@example.test' })
        .expect(200);
      expect(res.body.error.message).toBe('Used email not defined as test in config.');
    });

    it('sends the test email through SMTP', async () => {
      enableSmtp();
      const res = await app
        .request()
        .post('/message/test/email')
        .set('Authorization', TEST_SERVICE.token)
        .query({ email: TEST_SERVICE.emails[0] })
        .expect(200);
      expect(res.body.data).toMatchObject({ messageId: 'id-1' });
      expect(sendMail.mock.calls[0][0]).toMatchObject({ subject: 'Test message', text: 'Test message text.' });
    });

    it('reports an SMTP failure', async () => {
      enableSmtp(async () => {
        throw Object.assign(new Error('smtp down'), { errorCode: 502 });
      });
      const res = await app
        .request()
        .post('/message/test/email')
        .set('Authorization', TEST_SERVICE.token)
        .query({ email: TEST_SERVICE.emails[0] })
        .expect(200);
      expect(res.body.error).toEqual({ code: 502, message: 'smtp down' });
    });
  });

  describe('POST /message/usersList (email part)', () => {
    const post = (body: any) => authed(app.request().post('/message/usersList')).send(body);

    it('emails users and flags an important message', async () => {
      enableSmtp();
      app
        .nock(ID_API)
        .post('/user/info/id')
        .reply(200, [{ userId: 'u-mail', email: 'u@example.test', phone: '+380501112233' }]);
      const res = await post({
        list_user_id: ['u-mail'],
        title_message: 'Title',
        full_message: 'Full',
        is_important: true,
        allow_hide: true,
        expired_at: '2099-01-01T00:00:00.000Z',
      }).expect(200);
      expect(res.body.sendByEmail).toMatchObject({ messageId: 'id-1' });

      const important = await authed(app.request().get('/message/important')).query({ user_id: 'u-mail' }).expect(200);
      expect(important.body.data).toHaveLength(1);
      expect(important.body.data[0]).toMatchObject({ titleMessage: 'Title', isActive: true, allowHide: true });
    });

    it('answers 400 for non-boolean important flags', async () => {
      enableSmtp();
      app
        .nock(ID_API)
        .post('/user/info/id')
        .times(2)
        .reply(200, [{ userId: 'u-mail2', email: 'u2@example.test' }]);
      await post({ list_user_id: ['u-mail2'], title_message: 'T', full_message: 'F', is_important: 'yes' }).expect(400);
      await post({ list_user_id: ['u-mail2'], title_message: 'T', full_message: 'F', is_important: true, allow_hide: 'no' }).expect(400);
    });

    it('answers 500 when the email send fails but still reports the stored message', async () => {
      enableSmtp(async () => {
        throw new Error('smtp down');
      });
      app
        .nock(ID_API)
        .post('/user/info/id')
        .reply(200, [{ userId: 'u-mail3', email: 'u3@example.test' }]);
      const res = await post({ list_user_id: ['u-mail3'], title_message: 'T', full_message: 'F' }).expect(500);
      expect(res.body.sendByEmail).toBe('smtp down');
      expect(res.body.messageId).toEqual(expect.any(Number));
    });
  });
});
