import type { Response as SupertestResponse } from 'supertest';

import { TestApp, TEST_AUTH_HEADER, TEST_SERVICE } from './test-app';

describe('Message Controller', () => {
  let app: TestApp;

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

  describe('POST /message/test/sms', () => {
    it('rejects requests without the test service token', async () => {
      await app.request().post('/message/test/sms').query({ phone: TEST_SERVICE.phones[0] }).expect(401);
    });

    it('sends through the real (canned) SMS adapter for a whitelisted test phone', async () => {
      await app
        .request()
        .post('/message/test/sms')
        .set('Authorization', TEST_SERVICE.token)
        .query({ phone: TEST_SERVICE.phones[0] })
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.error).toBeUndefined();
        });
    });

    it('reports an error for a phone not whitelisted in testService.phones', async () => {
      await app
        .request()
        .post('/message/test/sms')
        .set('Authorization', TEST_SERVICE.token)
        .query({ phone: '+380000000000' })
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.error).toHaveProperty('message', 'Used phone not defined as test in config.');
        });
    });
  });

  describe('POST /message/test/email', () => {
    it('reports the SMTP-disabled result for a whitelisted test email', async () => {
      await app
        .request()
        .post('/message/test/email')
        .set('Authorization', TEST_SERVICE.token)
        .query({ email: TEST_SERVICE.emails[0] })
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual({ skipped: true, reason: 'SMTP is disabled in config.' });
        });
    });
  });

  describe('GET /message', () => {
    it('rejects requests without Basic auth', async () => {
      await app.request().get('/message').expect(401);
    });

    it('round-trips through the real database and returns an empty list on a fresh schema', async () => {
      await app
        .request()
        .get('/message')
        .set('Authorization', TEST_AUTH_HEADER)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(Array.isArray(response.body.result)).toBe(true);
          expect(response.body.result).toHaveLength(0);
        });
    });
  });

  describe('user-scoped routes (NT-02)', () => {
    const routes: [string, string, string][] = [
      ['PUT', '/message/is_read', 'messages=1&user_id=1'],
      ['GET', '/message/unread', 'user_id=1'],
      ['GET', '/message/1', 'user_id=1'],
    ];

    it.each(routes)('%s %s rejects user_id access without Basic auth', async (method, path, query) => {
      const req = method === 'PUT' ? app.request().put(`${path}?${query}`) : app.request().get(`${path}?${query}`);
      await req.expect(401);
    });

    it('GET /message/unread returns a count with Basic auth and user_id', async () => {
      await app
        .request()
        .get('/message/unread')
        .query({ user_id: 1 })
        .set('Authorization', TEST_AUTH_HEADER)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body).toEqual({ total: 0 });
        });
    });

    it('GET /message/unread answers 400 when neither access_token nor user_id is given', async () => {
      await app.request().get('/message/unread').set('Authorization', TEST_AUTH_HEADER).expect(400);
    });

    it('GET /message/:id answers 404 for a message the user does not have', async () => {
      await app.request().get('/message/1').query({ user_id: 1 }).set('Authorization', TEST_AUTH_HEADER).expect(404);
    });
  });
  describe('PUT /message/important/:id/set-unimportant (NT-07)', () => {
    // Seed an important message for the user through the app's own models.
    const seed = async (userId: string, allowHide: boolean) => {
      const { IncommingMessagesModel } = require('../src/models/incomming_messages');
      const { UsersMessagesModel } = require('../src/models/users_messages');
      const { ImportantMessagesModel } = require('../src/models/important_messages');
      const message = await new IncommingMessagesModel().IncommingMessages.create({ title_message: 'nt07' });
      const userMessage = await new UsersMessagesModel().UsersMessages.create({ user_id: userId, message_id: message.message_id });
      const important = await new ImportantMessagesModel().ImportantMessages.create({
        user_message_id: userMessage.user_message_id,
        message_id: message.message_id,
        is_active: true,
        allow_hide: allowHide,
      });
      return { messageId: message.message_id, userMessageId: userMessage.user_message_id, important };
    };
    const reload = async (userMessageId: number) => {
      const { ImportantMessagesModel } = require('../src/models/important_messages');
      return new ImportantMessagesModel().ImportantMessages.findOne({ where: { user_message_id: userMessageId } });
    };
    const put = (id: number, query: Record<string, any>) =>
      app.request().put(`/message/important/${id}/set-unimportant`).query(query).set('Authorization', TEST_AUTH_HEADER);

    it.each([[{}], [{ strict_allow_hide: 'true' }], [{ strict_allow_hide: 'false' }]])(
      'refuses a message with allow_hide=false and keeps it active (query %j)',
      async (extra) => {
        const { messageId, userMessageId } = await seed('nt07-user', false);
        await put(messageId, { user_id: 'nt07-user', ...extra }).expect(400);
        const row = await reload(userMessageId);
        expect(row.is_active).toBe(true);
        expect(row.allow_hide).toBe(false);
      },
    );

    it('deactivates a message with allow_hide=true without modifying allow_hide', async () => {
      const { messageId, userMessageId } = await seed('nt07-user', true);
      await put(messageId, { user_id: 'nt07-user' }).expect(200);
      const row = await reload(userMessageId);
      expect(row.is_active).toBe(false);
      expect(row.allow_hide).toBe(true);
    });

    it("answers 404 for another user's message and leaves it active", async () => {
      const { messageId, userMessageId } = await seed('nt07-owner', true);
      await put(messageId, { user_id: 'nt07-other' }).expect(404);
      expect((await reload(userMessageId)).is_active).toBe(true);
    });
  });

  describe('DELETE /message/toAll/:id (NT-08)', () => {
    const models = () => ({
      incoming: new (require('../src/models/incomming_messages').IncommingMessagesModel)().IncommingMessages,
      users: new (require('../src/models/users_messages').UsersMessagesModel)().UsersMessages,
    });
    const seed = async (showToAll: boolean) => {
      const { incoming, users } = models();
      const message = await incoming.create({ title_message: 'nt08' });
      await users.create({ user_id: 'nt08-user', message_id: message.message_id, show_to_all: showToAll });
      return message.message_id as number;
    };
    const counts = async (id: number) => {
      const { incoming, users } = models();
      return [await incoming.count({ where: { message_id: id } }), await users.count({ where: { message_id: id } })];
    };
    const del = (id: number | string) => app.request().delete(`/message/toAll/${id}`).set('Authorization', TEST_AUTH_HEADER);

    it('answers 404 for a normal message and keeps its rows', async () => {
      const id = await seed(false);
      await del(id).expect(404);
      expect(await counts(id)).toEqual([1, 1]);
    });

    it('deletes a broadcast message with both rows', async () => {
      const id = await seed(true);
      const res = await del(id).expect(200);
      expect(res.body).toEqual({ isDeleted: true });
      expect(await counts(id)).toEqual([0, 0]);
    });

    it('answers 400 for a non-numeric id', async () => {
      await del('abc').expect(400);
    });
  });
});
