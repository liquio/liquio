import { TestApp, TEST_AUTH_HEADER, TEST_SERVICE } from './test-app';

const ID_API = 'http://id-api:8080';
const ECONSULTING_URL = 'http://econsulting.example.test';
const PERSIST_LINK_URL = 'http://persist-link.example.test';
const PHONE = '+380501112233';

describe('Message Controller: SMS and complex sending', () => {
  let app: TestApp;
  let savedConf: any;
  const authed = (req: any) => req.set('Authorization', TEST_AUTH_HEADER);

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    savedConf = { ...(global as any).conf };
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  afterEach(async () => {
    for (const key of Object.keys((global as any).conf)) {
      if (!(key in savedConf)) delete (global as any).conf[key];
    }
    Object.assign((global as any).conf, savedConf);
    await TestApp.afterEach();
  });

  const setConf = (values: Record<string, any>) => Object.assign((global as any).conf, values);
  const mockUsers = (users: any[]) => app.nock(ID_API).post('/user/info/id').reply(200, users);
  const smsUser = (id: string, extra: any = {}) => ({
    userId: id,
    phone: PHONE,
    email: 'user@example.test',
    valid: { phone: true },
    first_name: 'Ann',
    last_name: 'Doe',
    middle_name: 'M',
    ...extra,
  });

  describe('POST /message/phonesList', () => {
    it('requires Basic auth and a phones list', async () => {
      await app
        .request()
        .post('/message/phonesList')
        .send({ list_phone: [PHONE] })
        .expect(401);
      await authed(app.request().post('/message/phonesList')).send({}).expect(400);
      await authed(app.request().post('/message/phonesList')).send({ list_phone: [] }).expect(400);
    });

    it('rejects phones denied by the SMS blacklist', async () => {
      setConf({ smsBlacklist: ['+38050'] });
      const res = await authed(app.request().post('/message/phonesList'))
        .send({ list_phone: [PHONE], short_message: 'hi' })
        .expect(500);
      expect(res.body).toEqual({ error: 'Some phones denied by blacklist.', blockedPhones: [PHONE] });
    });

    it('sends through the E-Consulting service when notifyhub sending is on', async () => {
      setConf({ sendSmsByNotifyhubAPI: true, eConsultingService: { sendComplexMessageUrl: `${ECONSULTING_URL}/send`, Authorization: 'Basic e2e' } });
      app
        .nock(ECONSULTING_URL)
        .post('/send', (body: any) => body.Channel === '2' && body.Phone === PHONE && body.MsgBody === 'hello')
        .reply(200, { MessageID: 'm-1' });
      const res = await authed(app.request().post('/message/phonesList'))
        .send({ list_phone: [PHONE], short_message: 'hello' })
        .expect(200);
      expect(res.body).toEqual({ processingId: 'm-1', rawResponse: { MessageID: 'm-1' } });
    });

    it('answers an empty result when the E-Consulting URL is not configured', async () => {
      setConf({ sendSmsByNotifyhubAPI: true, eConsultingService: {} });
      const res = await authed(app.request().post('/message/phonesList'))
        .send({ list_phone: [PHONE], short_message: 'hello' })
        .expect(200);
      expect(res.body).toEqual({});
    });

    it('sends through the SMS gate for one and for several phones and stores the message', async () => {
      setConf({ sendSmsByNotifyhubAPI: false });
      const one = await authed(app.request().post('/message/phonesList'))
        .send({ list_phone: [PHONE], short_message: 'hello' })
        .expect(200);
      expect(one.body).toEqual({ sendBySms: '"aaaaaaaa-1111-aaaa-1111-aaaaaaaaaaaa"' });

      const many = await authed(app.request().post('/message/phonesList'))
        .send({ list_phone: [PHONE, '+380509998877'], short_message: 'hello', short_message_translit: 'hello' })
        .expect(200);
      expect(many.body.sendBySms).toHaveLength(2);

      const { IncommingMessagesModel } = require('../src/models/incomming_messages');
      const stored = await new IncommingMessagesModel().IncommingMessages.findAll({ where: { short_message: 'hello' } });
      expect(stored.length).toBeGreaterThanOrEqual(2);
    });

    it('answers 500 when the message can not be stored', async () => {
      setConf({ sendSmsByNotifyhubAPI: false });
      await authed(app.request().post('/message/phonesList'))
        .send({ list_phone: [PHONE], message_crypt_type_id: 424242 })
        .expect(500);
    });

    it('answers the gate status code when the phone is empty', async () => {
      setConf({ sendSmsByNotifyhubAPI: false });
      const { CustomGate } = require('../src/models/smsGate/customGate');
      const spy = jest.spyOn(CustomGate.prototype, 'sendOneSms').mockRejectedValue({ statusCode: 400, message: 'phone empty' });
      try {
        await authed(app.request().post('/message/phonesList'))
          .send({ list_phone: [PHONE], short_message: 'x' })
          .expect(400);
      } finally {
        spy.mockRestore();
      }
    });

    it('sends private messages through Corezoid and replays them on the error callback', async () => {
      setConf({ sendSmsByNotifyhubAPI: false });
      let ref = '';
      app
        .nock('https://api.corezoid.com')
        .post(/\/api\/1\/json\/\/(\d+)\/[0-9a-f]{40}$/)
        .reply(200, function (uri: string) {
          ref = `${/\/(\d+)\/[0-9a-f]{40}$/.exec(uri)![1]}ref`;
          return { request_proc: 'ok' };
        });
      await authed(app.request().post('/message/phonesList')).send({
        list_phone: [PHONE],
        short_message: 'secret',
        short_message_translit: 'secret',
        private: true,
      });
      expect(ref).not.toBe('');

      const replay = await app.request().get('/message/senderErrorCallback').query({ id: ref }).expect(200);
      expect(replay.body).toEqual({ sendBySms: '"aaaaaaaa-1111-aaaa-1111-aaaaaaaaaaaa"' });
    });

    it('answers an empty body when the Corezoid request fails', async () => {
      setConf({ sendSmsByNotifyhubAPI: false });
      app.nock('https://api.corezoid.com').post(/.*/).reply(500, {});
      const res = await authed(app.request().post('/message/phonesList')).send({ list_phone: [PHONE], short_message: 's', private: true });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });
  });

  describe('POST /message/test/user and /message/test/sms', () => {
    it('rejects a user id that is not a configured test user', async () => {
      const res = await app.request().post('/message/test/user').set('Authorization', TEST_SERVICE.token).query({ user_id: 'unknown' }).expect(200);
      expect(res.body.error.message).toBe('Used user ID not defined as test in config.');
    });

    it('sends SMS and email to a configured test user', async () => {
      mockUsers([smsUser(TEST_SERVICE.userIds[0])]);
      const res = await app
        .request()
        .post('/message/test/user')
        .set('Authorization', TEST_SERVICE.token)
        .query({ user_id: TEST_SERVICE.userIds[0] })
        .expect(200);
      expect(res.body.data.smsSendingResult).toBe('"aaaaaaaa-1111-aaaa-1111-aaaaaaaaaaaa"');
      expect(res.body.data.emailSendingResult).toMatchObject({ skipped: true });
    });

    it('reports an id-api failure', async () => {
      app.nock(ID_API).post('/user/info/id').reply(500, {});
      const res = await app
        .request()
        .post('/message/test/user')
        .set('Authorization', TEST_SERVICE.token)
        .query({ user_id: TEST_SERVICE.userIds[0] })
        .expect(200);
      expect(res.body.error).toBeDefined();
    });

    it('reports a failed gate send on the test SMS route', async () => {
      const { CustomGate } = require('../src/models/smsGate/customGate');
      const spy = jest.spyOn(CustomGate.prototype, 'sendOneSms').mockRejectedValue({ errorCode: 502, message: 'gate failure' });
      try {
        const res = await app
          .request()
          .post('/message/test/sms')
          .set('Authorization', TEST_SERVICE.token)
          .query({ phone: TEST_SERVICE.phones[0] })
          .expect(200);
        expect(res.body.error).toEqual({ code: 502, message: 'gate failure' });
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('POST /message/test/comlex_options', () => {
    const post = (query: any, body: any = {}) => authed(app.request().post('/message/test/comlex_options')).query(query).send(body);

    it('rejects an id that is not a configured test user', async () => {
      const res = await post({ user_id: 'unknown' }).expect(200);
      expect(res.body.error.message).toBe('Used ID not defined as test in config.');
    });

    it('reports a missing user', async () => {
      mockUsers([]);
      const res = await post({ user_id: TEST_SERVICE.userIds[0] }).expect(200);
      expect(res.body.error.message).toBe("Can't find user data");
    });

    it('sends the test text over every transport', async () => {
      setConf({
        eConsultingService: { sendComplexMessageUrl: `${ECONSULTING_URL}/send` },
        persistLink: { createLinkUrl: `${PERSIST_LINK_URL}/link` },
      });
      mockUsers([smsUser(TEST_SERVICE.userIds[0])]);
      app.nock(PERSIST_LINK_URL).post('/link').reply(200, 'https://link.example.test/doc');
      app.nock(ECONSULTING_URL).post('/send').times(3).reply(200, { MessageID: 'm-2' });
      const res = await post({ user_id: TEST_SERVICE.userIds[0] }, { text: 'see {document=77}' }).expect(200);
      expect(res.body.data).toEqual({ isConnectionToEConsultApi: true, processingIdsList: ['m-2', 'm-2', 'm-2'] });
    });
  });

  describe('POST /message/complex_options', () => {
    const post = (body: any) => authed(app.request().post('/message/complex_options')).send(body);
    const valid = (overrides: any = {}) => ({
      workflowId: 1,
      transfers: ['sms', 'email'],
      destination: { userId: 'u-complex' },
      options: { general: { G: 1 }, sms: { outId: 's' }, email: { outId: 'e' } },
      text: { short: 'short {document=5}', medium: 'medium', large: 'large', largeTitle: 'Title' },
      ...overrides,
    });

    beforeEach(() => {
      setConf({
        eConsultingService: { sendComplexMessageUrl: `${ECONSULTING_URL}/send`, logAll: true },
        persistLink: { createLinkUrl: `${PERSIST_LINK_URL}/link` },
      });
    });

    it('requires Basic auth', async () => {
      await app.request().post('/message/complex_options').send(valid()).expect(401);
    });

    it('validates the payload', async () => {
      const res = await post({ transfers: 'sms', destination: 1, options: 1, text: 'x' }).expect(400);
      expect(res.body.error.list).toHaveLength(4);
      const empty = await post(valid({ text: {} })).expect(400);
      expect(empty.body.error.list).toEqual(['Text not defined.']);
    });

    it('answers 400 when the user is unknown or id-api fails', async () => {
      mockUsers([]);
      await post(valid({ text: { short: 's' } })).expect(400);
      app.nock(ID_API).post('/user/info/id').reply(500, {});
      const failed = await post(valid({ text: { short: 's' } })).expect(400);
      expect(failed.body.error.message).toBe('User definition error.');
    });

    it('sends every transfer, resolves links and stores the message', async () => {
      mockUsers([smsUser('u-complex')]);
      app.nock(PERSIST_LINK_URL).post('/link').reply(200, 'https://link.example.test/short');
      app
        .nock(PERSIST_LINK_URL)
        .post('/link', (body: any) => body.type === 'openStack' && body.options.fileName === 'a.pdf')
        .reply(200, 'https://link.example.test/a');
      app
        .nock(ECONSULTING_URL)
        .post('/send', (body: any) => body.Channel === '2' && body.Phone === PHONE && body.MsgDoc === 'https://link.example.test/a' && body.G === 1)
        .reply(200, { MessageID: 'sms-1' });
      app
        .nock(ECONSULTING_URL)
        .post('/send', (body: any) => body.Channel === '3' && body.email === 'user@example.test')
        .reply(200, { MessageID: 'mail-1' });
      const res = await post(valid({ options: { general: { G: 1 }, postal: { attach: ['a.pdf'] } } })).expect(200);
      expect(res.body.processingIds).toEqual(['sms-1', 'mail-1']);

      const { IncommingMessagesModel } = require('../src/models/incomming_messages');
      const stored = await new IncommingMessagesModel().IncommingMessages.findOne({ where: { processing_id: 'sms-1;mail-1' } });
      expect(stored.list_user_id).toEqual(['u-complex']);
      expect(stored.short_message).toBe('short https://link.example.test/short');
    });

    it('sends postal letters with the recipient name and skips unknown transfers', async () => {
      mockUsers([smsUser('u-complex')]);
      app
        .nock(ECONSULTING_URL)
        .post('/send', (body: any) => body.Channel === '4' && body.NameFirst === 'Ann' && body.NameSecond === 'Doe' && body.NameMiddle === 'M')
        .reply(200, { MessageID: 'letter-1' });
      const res = await post(valid({ transfers: ['registeredLetter', 'unknown'], text: { medium: 'm', large: 'L', largeTitle: 'T' } })).expect(200);
      expect(res.body.processingIds).toEqual(['letter-1']);
    });

    it('does not send SMS to a blacklisted phone', async () => {
      setConf({ smsBlacklist: ['+38050'] });
      mockUsers([smsUser('u-complex')]);
      const res = await post(valid({ transfers: ['sms'], text: { short: 's' } })).expect(200);
      expect(res.body).toEqual({ processingIds: ['User phone denied by blacklist.'], rawResponses: [null] });
    });

    it('works without a user id and stores the ipn', async () => {
      app.nock(ECONSULTING_URL).post('/send').reply(200, { MessageID: 'm-ipn' });
      const res = await post(
        valid({ transfers: ['push'], destination: { ipn: '1234567890', address: 'Test street' }, text: { medium: 'm' } }),
      ).expect(200);
      expect(res.body.processingIds).toEqual(['m-ipn']);
    });

    it('answers 500 when the attachment link can not be created', async () => {
      mockUsers([smsUser('u-complex')]);
      app.nock(PERSIST_LINK_URL).post('/link').reply(500, {});
      await post(valid({ options: { postal: { attach: ['a.pdf'] } }, text: { medium: 'm' } })).expect(500);
    });

    it('answers 500 when the message can not be stored', async () => {
      app.nock(ECONSULTING_URL).post('/send').reply(200, { MessageID: 'm-bad' });
      const res = await post(valid({ transfers: ['push'], destination: { ipn: 'x'.repeat(300) }, text: { medium: 'm' } })).expect(500);
      expect(res.body.error.message).toBe('Incomming message saving error.');
    });

    it('answers 500 when the user message can not be stored', async () => {
      mockUsers([smsUser('u-complex')]);
      app.nock(ECONSULTING_URL).post('/send').reply(200, { MessageID: 'm-um' });
      const { UsersMessagesModel } = require('../src/models/users_messages');
      const UsersMessages = new UsersMessagesModel().UsersMessages;
      const spy = jest.spyOn(UsersMessages, 'create').mockRejectedValue(new Error('db'));
      try {
        // The controller uses its own model instance, so force the failure through the connection.
        const { connection } = require('../src/models/DB');
        const original = connection.query.bind(connection);
        const querySpy = jest.spyOn(connection, 'query').mockImplementation((sql: any, ...rest: any[]) => {
          if (String(sql?.query ?? sql).includes('INSERT INTO "users_messages"')) return Promise.reject(new Error('db'));
          return original(sql, ...rest);
        });
        const res = await post(valid({ transfers: ['push'], text: { medium: 'm' } })).expect(500);
        expect(res.body.error.message).toBe('Users message saving error.');
        querySpy.mockRestore();
      } finally {
        spy.mockRestore();
      }
    });
  });
});
