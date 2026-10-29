import { TestApp, TEST_AUTH_HEADER } from './test-app';

const ID_API = 'http://id-api:8080';
const SMS_RESPONSE = '"aaaaaaaa-1111-aaaa-1111-aaaaaaaaaaaa"';

const MODEL_CLASSES: Record<string, string> = { Communications: 'CommunicationModel' };
const modelCache = new Map<string, any>();
// One instance per model: every `new XModel()` redefines the Sequelize model.
const model = (file: string, name: string) => {
  if (!modelCache.has(name)) {
    const ModelClass = require(`../src/models/${file}`)[MODEL_CLASSES[name] || `${name}Model`];
    modelCache.set(name, new ModelClass()[name]);
  }
  return modelCache.get(name);
};

describe('Message Controller: user messages', () => {
  let app: TestApp;
  const authed = (req: any) => req.set('Authorization', TEST_AUTH_HEADER);

  beforeAll(async () => {
    await TestApp.beforeAll();
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
    jest.restoreAllMocks();
    delete (global as any).conf.smsBlacklist;
    await TestApp.afterEach();
  });

  const user = (id: string, extra: any = {}) => ({
    userId: id,
    phone: '+380501112233',
    email: `${id}@example.test`,
    valid: { phone: true },
    ipn: `ipn-${id}`,
    ...extra,
  });

  // Seed an event with sms and email transports and the given subscribers.
  const seedEvent = async (name: string, subscribers: string[], opts: { enable?: boolean; private?: boolean } = {}) => {
    const sms = (await model('communications', 'Communications').findOrCreate({ where: { name: 'sms', enable: true } }))[0];
    const email = (await model('communications', 'Communications').findOrCreate({ where: { name: 'email', enable: true } }))[0];
    const event = await model('events', 'Events').create({ name, enable: opts.enable ?? true, private: opts.private ?? false });
    const settings = [];
    for (const communication of [sms, email]) {
      const setting = await model('settings', 'Settings').create({
        event_id: event.event_id,
        communication_id: communication.communication_id,
        enable: true,
      });
      settings.push(setting);
      for (const userId of subscribers) {
        await model('user_subscribes', 'UserSubscribes').create({ user_id: userId, setting_id: setting.setting_id });
      }
    }
    return event.event_id as number;
  };

  describe('POST /message/usersList', () => {
    const post = (body: any) => authed(app.request().post('/message/usersList')).send(body);

    it('requires Basic auth and a users list', async () => {
      await app.request().post('/message/usersList').send({}).expect(401);
      const res = await post({}).expect(400);
      expect(res.body.message).toBe('Users List empty');
      await post({ list_user_id: [' '] }).expect(400);
    });

    it('answers 400 for a non-boolean not_send', async () => {
      const res = await post({ list_user_id: ['u-ns'], not_send: 'yes' }).expect(400);
      expect(res.body.message).toBe('not_send parameter must have boolean type');
    });

    it('stores a message without sending it when not_send is set', async () => {
      app
        .nock(ID_API)
        .post('/user/info/id')
        .reply(200, [user('u-ns2')]);
      const res = await post({
        list_user_id: ['u-ns2'],
        not_send: true,
        short_message: 'short',
        short_message_translit: 'short',
        title_message: 'T',
        full_message: 'F',
        attachments: [{ fileId: 'f1', p7sFileId: 'p1', filename: 'a.pdf' }],
      }).expect(200);
      expect(res.body.usersMessages).toHaveLength(1);
      expect(res.body.sendBySms).toBeUndefined();

      const stored = await model('incomming_messages', 'IncommingMessages').findOne({ where: { message_id: res.body.messageId } });
      expect(stored.meta).toEqual({ attachments: [{ fileId: 'f1', p7sFileId: 'p1', fileName: 'a.pdf' }] });
    });

    it('sends SMS to users and reports phones denied by the blacklist', async () => {
      app
        .nock(ID_API)
        .post('/user/info/id')
        .reply(200, [user('u-sms')]);
      const sent = await post({ list_user_id: ['u-sms'], short_message: 's', short_message_translit: 's' }).expect(200);
      expect(sent.body.sendBySms).toBe(SMS_RESPONSE);

      (global as any).conf.smsBlacklist = ['+38050'];
      app
        .nock(ID_API)
        .post('/user/info/id')
        .reply(200, [user('u-sms')]);
      const blocked = await post({ list_user_id: ['u-sms'], short_message: 's', short_message_translit: 's' }).expect(200);
      expect(blocked.body.sendBySms).toEqual({ error: 'Some phones denied by blacklist.', blockedPhones: ['+380501112233'] });
    });

    it('finds users by ipn and reports the ones that were not found', async () => {
      app
        .nock(ID_API)
        .post('/user/info/ipn', (body: any) => Array.isArray(body.ipn))
        .reply(200, [user('u-ipn', { ipn: '1111111111' })]);
      const res = await post({ list_user_ipn: ['1111111111', '2222222222'], title_message: 'T', full_message: 'F' }).expect(500);
      expect(res.body.ipnNotFound).toEqual(['2222222222']);
      expect(res.body.usersMessages).toHaveLength(1);
    });
  });

  describe('POST /message/eventId and POST /message', () => {
    it('validates the event id and the event itself', async () => {
      await authed(app.request().post('/message/eventId')).send({}).expect(400);
      await authed(app.request().post('/message/eventId')).send({ event_id: 987654 }).expect(500);
      await authed(app.request().post('/message/eventId')).send({ event_id: 987654, message_crypt_type_id: 424242 }).expect(500);
    });

    it('sends to subscribers of an event and stores their messages', async () => {
      const eventId = await seedEvent('e2e-send-event', ['u-ev1', 'u-ev2']);
      app
        .nock(ID_API)
        .post('/user/info/id')
        .reply(200, [user('u-ev1'), user('u-ev2', { valid: { phone: false } })]);
      const res = await authed(app.request().post('/message/eventId'))
        .send({ event_id: eventId, short_message: 'hi', short_message_translit: 'hi', title_message: 'T', full_message: 'Body' })
        .expect(200);
      expect(res.body.sendBySms).toBe(SMS_RESPONSE);
      expect(res.body.sendByEmail).toMatchObject({ skipped: true });

      const unread = await authed(app.request().get('/message/unread')).query({ user_id: 'u-ev1' }).expect(200);
      expect(unread.body).toEqual({ total: 1 });
    });

    it('removes the stored message when sending fails', async () => {
      const eventId = await seedEvent('e2e-failing-event', ['u-fail']);
      app.nock(ID_API).post('/user/info/id').reply(500, {});
      const before = await model('incomming_messages', 'IncommingMessages').count({ where: { event_id: eventId } });
      await authed(app.request().post('/message/eventId')).send({ event_id: eventId, short_message_translit: 'x', short_message: 'x' });
      expect(before).toBe(0);
      expect(await model('incomming_messages', 'IncommingMessages').count({ where: { event_id: eventId } })).toBe(0);
    });

    it('adds a message for listed users of an event through POST /message', async () => {
      const eventId = await seedEvent('e2e-add-event', ['u-add']);
      app
        .nock(ID_API)
        .post('/user/info/id')
        .reply(200, [user('u-add')]);
      const res = await authed(app.request().post('/message'))
        .send({
          event_id: eventId,
          list_user_id: ['u-add'],
          short_message: 'hi',
          short_message_translit: 'hi',
          title_message: 'T',
          full_message: 'Body',
        })
        .expect(200);
      expect(res.body.sendBySms).toBe(SMS_RESPONSE);
      const messages = await authed(app.request().get('/message')).query({ user_id: 'u-add' }).expect(200);
      expect(messages.body.result).toHaveLength(1);
    });

    it('answers the error for POST /message with an unknown event', async () => {
      await authed(app.request().post('/message'))
        .send({ event_id: 987654, list_user_id: ['u-add'] })
        .expect(500);
    });

    it('answers 500 for POST /message when the message can not be stored', async () => {
      await authed(app.request().post('/message'))
        .send({ event_id: 987654, list_user_id: ['u-add'], message_crypt_type_id: 424242 })
        .expect(500);
    });
  });

  describe('broadcast messages', () => {
    it('creates, lists and deletes a message for all users', async () => {
      await authed(app.request().post('/message/toAll')).send({ title_message: 'only title' }).expect(400);
      const created = await authed(app.request().post('/message/toAll')).send({ title_message: 'Broadcast', full_message: 'Everyone' }).expect(200);
      expect(created.body.createdMessageId).toEqual(expect.any(Number));

      const asc = await authed(app.request().get('/message/toAll')).query({ order_date: 'asc', start: 0, count: 5 }).expect(200);
      const desc = await authed(app.request().get('/message/toAll')).expect(200);
      expect(asc.body.messages.map((m: any) => m.titleMessage)).toContain('Broadcast');
      expect(desc.body.messages[0]).toMatchObject({ showToAll: true });
      await app.request().get('/message/toAll').expect(401);
    });
  });

  describe('GET /message', () => {
    const seed = async (userId: string, count: number, extra: any = {}) => {
      const ids = [];
      for (let i = 0; i < count; i++) {
        const message = await model('incomming_messages', 'IncommingMessages').create({
          title_message: `Title ${i}`,
          full_message: `Full ${i}`,
          short_message: i % 2 ? `Short ${i}` : null,
          short_message_translit: i === 2 ? 'Translit' : null,
          ...extra,
        });
        await model('users_messages', 'UsersMessages').create({ user_id: userId, message_id: message.message_id, is_read: i === 0 ? 1 : 0 });
        ids.push(message.message_id);
      }
      return ids;
    };

    it('lists the messages of a user with read filters, dates and client id', async () => {
      const eventId = await seedEvent('e2e-list-event', []);
      await seed('u-list', 3, { event_id: eventId, client_id: 'client-a' });

      const all = await authed(app.request().get('/message')).query({ user_id: 'u-list' }).expect(200);
      expect(all.body.result).toHaveLength(3);
      expect(all.body.result.map((m: any) => m.text).sort()).toEqual(['Full 0', 'Short 1', 'Translit']);
      expect(all.headers['x-total']).toBe('3');
      expect(all.body.meta.pagination.total).toBe(3);

      const read = await authed(app.request().get('/message')).query({ user_id: 'u-list', is_read: 1 }).expect(200);
      expect(read.body.result).toHaveLength(1);
      const unread = await authed(app.request().get('/message')).query({ user_id: 'u-list', is_read: 0 }).expect(200);
      expect(unread.body.result).toHaveLength(2);

      const today = new Date().toISOString().slice(0, 10);
      const ranged = await authed(app.request().get('/message'))
        .query({ user_id: 'u-list', from_created_at: '2000-01-01', to_created_at: '2999-01-01', client_id: 'client-a' })
        .expect(200);
      expect(ranged.body.result).toHaveLength(3);
      const from = await authed(app.request().get('/message')).query({ user_id: 'u-list', from_created_at: today, count: 2 }).expect(200);
      expect(from.body.result).toHaveLength(2);
      const to = await authed(app.request().get('/message')).query({ user_id: 'u-list', to_created_at: '2000-01-01' }).expect(200);
      expect(to.body.result).toHaveLength(0);
    });

    it('lists with an access token and showAll, with filters and decrypted content', async () => {
      const { Auth } = require('../src/models/authServer');
      jest.spyOn(Auth.prototype, 'checkToken').mockResolvedValue({ _id: 'u-token' });
      const cryptType = await model('message_crypt_types', 'MessageCryptTypes').create({
        name: 'e2e-default-rule',
        rule_to_show: "(decryptedBase64) => Buffer.from(decryptedBase64, 'base64').toString('utf8')",
      });
      const broken = await model('message_crypt_types', 'MessageCryptTypes').create({ name: 'e2e-broken-rule', rule_to_show: 'not a function' });
      const eventId = await seedEvent('e2e-token-event', []);
      await seed('u-token', 2, { event_id: eventId });
      await seed('u-token', 1, {
        message_crypt_type_id: cryptType.id,
        decrypted_base64: 'aGVsbG8=',
        is_encrypted: false,
        title_message: 'Decrypted',
      });
      await seed('u-token', 1, { message_crypt_type_id: broken.id, decrypted_base64: 'aGVsbG8=', is_encrypted: false, title_message: 'Broken' });

      const res = await authed(app.request().get('/message')).query({ access_token: 'token', showAll: 'true', order_date: 'asc' }).expect(200);
      expect(res.body.result).toHaveLength(4);
      expect(res.body.meta).toMatchObject({ pagination: { total: 4 }, unread: 1, read: 3 });
      const decrypted = res.body.result.find((m: any) => m.titleMessage === 'Decrypted');
      expect(decrypted.decryptedToShow).toBe('hello');
      expect(res.body.result.find((m: any) => m.titleMessage === 'Broken').decryptionToShowError).toBeDefined();

      const filtered = await authed(app.request().get('/message'))
        .query({
          access_token: 'token',
          showAll: 'true',
          event_id: eventId,
          search: 'Title',
          is_read: 0,
          from_created_at: '2000-01-01',
          to_created_at: '2999-01-01',
        })
        .expect(200);
      expect(filtered.body.result).toHaveLength(1);
      const byRead = await authed(app.request().get('/message'))
        .query({ access_token: 'token', showAll: 'true', is_read: 1, from_created_at: '2000-01-01' })
        .expect(200);
      expect(byRead.body.result).toHaveLength(3);
      const byTo = await authed(app.request().get('/message'))
        .query({ access_token: 'token', showAll: 'true', to_created_at: '2999-01-01', client_id: 'none' })
        .expect(200);
      expect(byTo.body.result).toHaveLength(0);

      const plain = await authed(app.request().get('/message')).query({ access_token: 'token' }).expect(200);
      expect(plain.body.result).toHaveLength(2);
    });

    it('answers the token error status when the token is rejected', async () => {
      const { Auth } = require('../src/models/authServer');
      jest.spyOn(Auth.prototype, 'checkToken').mockResolvedValue(undefined);
      const res = await authed(app.request().get('/message')).query({ access_token: 'bad' }).expect(401);
      expect(res.body.error.message).toBe('Access token is not valid.');
    });

    it('lists public event messages without a user', async () => {
      const eventId = await seedEvent('e2e-public-event', []);
      await seed('u-public', 2, { event_id: eventId });
      const res = await authed(app.request().get('/message')).query({ start: 0, count: 50 }).expect(200);
      expect(res.body.result.length).toBeGreaterThanOrEqual(2);
      expect(res.body.result[0]).toHaveProperty('ListType');
    });
  });

  describe('read state, single message and important messages', () => {
    it('marks messages as read and counts unread ones', async () => {
      const first = await model('incomming_messages', 'IncommingMessages').create({ title_message: 'r1', short_message: 'r1' });
      const second = await model('incomming_messages', 'IncommingMessages').create({ title_message: 'r2', short_message: 'r2' });
      for (const message of [first, second]) {
        await model('users_messages', 'UsersMessages').create({ user_id: 'u-read', message_id: message.message_id });
      }
      const unread = () => authed(app.request().get('/message/unread')).query({ user_id: 'u-read', event_id: 1, client_id: 'x' });
      expect((await authed(app.request().get('/message/unread')).query({ user_id: 'u-read' }).expect(200)).body).toEqual({ total: 2 });
      expect((await unread().expect(200)).body).toEqual({ total: 0 });

      await authed(app.request().put('/message/is_read')).query({ user_id: 'u-read' }).expect(500);
      const res = await authed(app.request().put('/message/is_read'))
        .query({ user_id: 'u-read', messages: `${first.message_id},${second.message_id}` })
        .expect(200);
      expect(res.body).toHaveProperty('isSet');
      expect((await authed(app.request().get('/message/unread')).query({ user_id: 'u-read' }).expect(200)).body).toEqual({ total: 0 });
    });

    it('returns a single message with its decrypted view', async () => {
      const cryptType = await model('message_crypt_types', 'MessageCryptTypes').create({
        name: 'e2e-single',
        rule_to_show: "(decryptedBase64) => Buffer.from(decryptedBase64, 'base64').toString('utf8')",
      });
      const message = await model('incomming_messages', 'IncommingMessages').create({
        title_message: 'single',
        message_crypt_type_id: cryptType.id,
        is_encrypted: false,
        decrypted_base64: 'aGVsbG8=',
      });
      await model('users_messages', 'UsersMessages').create({ user_id: 'u-single', message_id: message.message_id });

      const res = await authed(app.request().get(`/message/${message.message_id}`))
        .query({ user_id: 'u-single' })
        .expect(200);
      expect(res.body).toMatchObject({ messageId: message.message_id, titleMessage: 'single', decryptedToShow: 'hello' });
      await authed(app.request().get('/message/abc')).query({ user_id: 'u-single' }).expect(400);
    });

    it('lists important messages and hides them on request', async () => {
      await authed(app.request().get('/message/important')).expect(400);

      const message = await model('incomming_messages', 'IncommingMessages').create({ title_message: 'imp', client_id: 'client-x' });
      const userMessage = await model('users_messages', 'UsersMessages').create({ user_id: 'u-imp', message_id: message.message_id });
      await model('important_messages', 'ImportantMessages').create({
        user_message_id: userMessage.user_message_id,
        message_id: message.message_id,
        is_active: true,
        allow_hide: true,
      });

      const list = await authed(app.request().get('/message/important'))
        .query({ user_id: 'u-imp', client_id: 'client-x', order_created_at: 'asc' })
        .expect(200);
      expect(list.body.data).toHaveLength(1);

      const { Auth } = require('../src/models/authServer');
      jest.spyOn(Auth.prototype, 'checkToken').mockResolvedValue({ _id: 'u-imp' });
      const byToken = await authed(app.request().get('/message/important')).query({ access_token: 't' }).expect(200);
      expect(byToken.body.data).toHaveLength(1);

      await authed(app.request().put('/message/important/abc/set-unimportant')).query({ user_id: 'u-imp' }).expect(400);
      await authed(app.request().put('/message/important/424242/set-unimportant')).query({ user_id: 'u-imp' }).expect(404);
      await authed(app.request().put(`/message/important/${message.message_id}/set-unimportant`))
        .query({})
        .expect(400);
      await authed(app.request().put(`/message/important/${message.message_id}/set-unimportant`))
        .query({ user_id: 'u-imp' })
        .expect(200);
      const after = await authed(app.request().get('/message/important')).query({ user_id: 'u-imp' }).expect(200);
      expect(after.body.data).toHaveLength(0);
    });
  });
});
