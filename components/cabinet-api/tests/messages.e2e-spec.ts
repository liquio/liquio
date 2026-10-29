import express from 'express';
import bodyParser from 'body-parser';
import type { Response as SupertestResponse } from 'supertest';
import supertest from 'supertest';

import AuthController from '../src/controllers/auth';
import MessageController from '../src/controllers/message';
import Controller from '../src/controllers/controller';
import Notifier from '../src/lib/notifier';
import HttpRequest from '../src/lib/http_request';
import Helpers from '../src/lib/helpers';
import { TestApp, NOTIFIER_URL } from './test-app';

// Message routes are not mounted by cabinet-api's Router: the real controllers are mounted on a small Express app.
describe('Messages and notifier', () => {
  let app: TestApp;
  let messagesRequest: () => supertest.Agent | any;
  let notifier: Notifier;

  const authorized = () => {
    const { jwt, payload } = app.generateUserToken();
    app.mockUserInfo(payload.authTokens.accessToken);
    return { jwt, accessToken: payload.authTokens.accessToken };
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();

    const auth = new AuthController();
    const messages = new MessageController();
    const messagesApp = express();
    messagesApp.set('query parser', 'extended');
    messagesApp.get('/messages', auth.getAuthMiddleware(), messages.getAll.bind(messages));
    messagesApp.put('/messages/read', bodyParser.json(), auth.getAuthMiddleware(), messages.setMessageStateIsRead.bind(messages));
    messagesApp.get('/messages/unread', auth.getAuthMiddleware(), messages.getCountUnreadMessages.bind(messages));
    messagesApp.get('/messages/important', auth.getAuthMiddleware(), messages.getImportantMessages.bind(messages));
    messagesApp.put('/messages/important/:id/hide', auth.getAuthMiddleware(), messages.hideImportantMessage.bind(messages));
    messagesApp.put('/messages/:id/decrypt', bodyParser.json(), auth.getAuthMiddleware(), messages.decrypt.bind(messages));
    messagesRequest = () => supertest(messagesApp);
    notifier = new Notifier();
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

  describe('MessageController', () => {
    it('GET /messages passes the filters to the notifier and answers its list unpacked', async () => {
      const { jwt, accessToken } = authorized();
      app
        .nock(NOTIFIER_URL)
        .get('/message')
        .query({
          access_token: accessToken,
          needEmails: 'true',
          showAll: 'true',
          event_id: '5',
          start: '0',
          count: '10',
          is_read: '0',
          order_date: 'desc',
          search: 'hello world',
          from_created_at: '2026-01-01',
          to_created_at: '2026-02-01',
        })
        .matchHeader('authorization', /^Basic /)
        .reply(200, { result: [{ id: 1 }], meta: { total: 1 } });

      await messagesRequest()
        .get('/messages')
        .query({
          event_id: '5',
          start: '0',
          count: '10',
          'filters[is_read]': '0',
          'sort[date]': 'desc',
          search: 'hello world',
          from_created_at: '2026-01-01',
          to_created_at: '2026-02-01',
        })
        .set('token', jwt)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body).toEqual({ data: [{ id: 1 }], meta: { total: 1 } });
        });
    });

    it('PUT /messages/read marks a message as read', async () => {
      const { jwt, accessToken } = authorized();
      app.nock(NOTIFIER_URL).put('/message/is_read').query({ access_token: accessToken, messages: '7' }).reply(200, { updated: 1 });

      await messagesRequest()
        .put('/messages/read')
        .set('token', jwt)
        .send({ messageId: 7 })
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual({ updated: 1 });
        });
    });

    it('GET /messages/unread asks the notifier by user ID', async () => {
      const { jwt } = authorized();
      app.nock(NOTIFIER_URL).get('/message/unread').query({ user_id: 'test-user-1' }).reply(200, { count: 3 });

      await messagesRequest()
        .get('/messages/unread')
        .set('token', jwt)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual({ count: 3 });
        });
    });

    it('GET /messages/important returns the list, or an empty list when the notifier fails', async () => {
      const first = authorized();
      app
        .nock(NOTIFIER_URL)
        .get('/message/important')
        .query({ access_token: first.accessToken })
        .reply(200, { data: [{ id: 2 }] });
      await messagesRequest()
        .get('/messages/important')
        .set('token', first.jwt)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual([{ id: 2 }]);
        });

      const second = authorized();
      app.nock(NOTIFIER_URL).get('/message/important').query({ access_token: second.accessToken }).reply(500, {});
      await messagesRequest()
        .get('/messages/important')
        .set('token', second.jwt)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual([]);
        });
    });

    it('PUT /messages/important/:id/hide hides the message and relays a notifier failure as 500', async () => {
      const first = authorized();
      app
        .nock(NOTIFIER_URL)
        .put('/message/important/4/set-unimportant')
        .query({ access_token: first.accessToken, messages: '4', strict_allow_hide: 'true' })
        .reply(200, { data: { hidden: true } });
      await messagesRequest()
        .put('/messages/important/4/hide')
        .set('token', first.jwt)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual({ hidden: true });
        });

      const second = authorized();
      app.nock(NOTIFIER_URL).put('/message/important/4/set-unimportant').query(true).reply(500, {});
      await messagesRequest().put('/messages/important/4/hide').set('token', second.jwt).expect(500);
    });

    it('PUT /messages/:id/decrypt sends the decrypted text to the notifier', async () => {
      const { jwt, accessToken } = authorized();
      app
        .nock(NOTIFIER_URL)
        .put('/message/9/decrypt', { decryptedBase64: 'dGVzdA==' })
        .query({ access_token: accessToken, messages: '9' })
        .reply(200, { data: { decrypted: true } });

      await messagesRequest()
        .put('/messages/9/decrypt')
        .set('token', jwt)
        .send({ decryptedBase64: 'dGVzdA==' })
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual({ decrypted: true });
        });
    });

    it('answers success with an empty payload when the notifier fails (errors are swallowed and logged)', async () => {
      const first = authorized();
      app.nock(NOTIFIER_URL).get('/message').query(true).reply(500, {});
      await messagesRequest().get('/messages').set('token', first.jwt).expect(200);

      const second = authorized();
      app.nock(NOTIFIER_URL).put('/message/is_read').query(true).reply(500, {});
      await messagesRequest().put('/messages/read').set('token', second.jwt).send({ messageId: 1 }).expect(200);

      const third = authorized();
      app.nock(NOTIFIER_URL).get('/message/unread').query(true).reply(500, {});
      await messagesRequest().get('/messages/unread').set('token', third.jwt).expect(200);

      const fourth = authorized();
      app.nock(NOTIFIER_URL).put('/message/3/decrypt').query(true).reply(500, {});
      await messagesRequest().put('/messages/3/decrypt').set('token', fourth.jwt).send({ decryptedBase64: 'x' }).expect(200);
    });

    it('requires authorization', async () => {
      await messagesRequest().get('/messages').expect(401);
    });
  });

  describe('Notifier', () => {
    it('sendToUser posts the recipients and reports whether an e-mail was sent', async () => {
      app
        .nock(NOTIFIER_URL)
        .post('/message/usersList', { list_user_id: ['u1'], title_message: 'Subject', full_message: '<p>Hi</p>', template_id: 3 })
        .reply(200, { sendByEmail: ['u1@example.test'] });
      expect(await notifier.sendToUser('u1', 'Subject', '<p>Hi</p>', 3)).toBe(true);

      app.nock(NOTIFIER_URL).post('/message/usersList').reply(200, { sendByEmail: [] });
      expect(await notifier.sendToUser(['u1', 'u2'], 'Subject', 'Body', 3)).toBe(false);

      app.nock(NOTIFIER_URL).post('/message/usersList').reply(500, {});
      expect(await notifier.sendToUser('u1', 'Subject', 'Body', 3)).toBe(false);
    });

    it('sendByEmails posts the e-mails and rethrows failures', async () => {
      app
        .nock(NOTIFIER_URL)
        .post('/message/emailsList', { list_email: ['a@example.test'], title_message: 'Subject', full_message: 'Body', template_id: 1 })
        .reply(200, { sent: true });
      expect(await notifier.sendByEmails('a@example.test', 'Subject', 'Body', 1)).toEqual({ response: { sent: true } });

      app.nock(NOTIFIER_URL).post('/message/emailsList').reply(500, {});
      await expect(notifier.sendByEmails(['a@example.test'], 'Subject', 'Body', 1)).rejects.toThrow();
    });

    it('sendPingRequest returns the notifier identification headers', async () => {
      app
        .nock(NOTIFIER_URL)
        .get('/test/ping_with_auth')
        .reply(200, { data: { message: 'pong' } }, { version: '1.2.3', customer: 'liquio', environment: 'test' });
      expect(await notifier.sendPingRequest()).toEqual({
        version: '1.2.3',
        customer: 'liquio',
        environment: 'test',
        body: { data: { message: 'pong' } },
      });

      app.nock(NOTIFIER_URL).get('/test/ping_with_auth').reply(500, {});
      expect(await notifier.sendPingRequest()).toBeUndefined();
    });

    it('getMessages ignores malformed pagination params', async () => {
      app.nock(NOTIFIER_URL).get('/message').query({ access_token: 'tok', needEmails: 'true', showAll: 'true' }).reply(200, { result: [], meta: {} });
      expect(await notifier.getMessages('tok', undefined, { start: 'x', count: 'y', filters: { is_read: 'z' } })).toEqual({ data: [], meta: {} });
    });
  });

  describe('HttpRequest', () => {
    it('sends a full response with a serializable shape', async () => {
      app.nock(NOTIFIER_URL).post('/echo').reply(200, 'plain text');

      const result = await HttpRequest.send({ url: `${NOTIFIER_URL}/echo`, method: HttpRequest.Methods.POST, body: '{}' }, true);
      expect(result.body).toBe('plain text');
      expect(result.response.status).toBe(200);
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('sendHeadRequest returns the requested header and rethrows errors', async () => {
      app.nock(NOTIFIER_URL).head('/file').reply(200, undefined, { 'Content-Length': '42' });
      expect(await HttpRequest.sendHeadRequest({ url: `${NOTIFIER_URL}/file`, method: 'HEAD' }, 'Content-Length')).toBe('42');

      app.nock(NOTIFIER_URL).head('/file').reply(404);
      await expect(HttpRequest.sendHeadRequest({ url: `${NOTIFIER_URL}/file`, method: 'HEAD' })).rejects.toThrow();
    });

    it('exposes constants and body parser factories', () => {
      expect(HttpRequest.Methods.DELETE).toBe('DELETE');
      expect(HttpRequest.ContentTypes.CONTENT_TYPE_JSON).toBe('application/json');
      expect(HttpRequest.Accepts.ACCEPT_JSON).toBe('application/json');
      expect(typeof HttpRequest.getJsonBodyParser()).toBe('function');
      expect(typeof HttpRequest.getUrlencodedBodyParser()).toBe('function');
      expect(typeof HttpRequest.getFormDataBodyParser()).toBe('function');

      const use = jest.fn();
      HttpRequest.parseBodyJson({ use });
      HttpRequest.parseBodyUrlencoded({ use });
      expect(use).toHaveBeenCalledTimes(2);
    });
  });

  describe('Helpers', () => {
    it('cutLongStrings shortens long strings and nested values', () => {
      expect(Helpers.cutLongStrings('short')).toBe('short');
      expect(Helpers.cutLongStrings('x'.repeat(100), 20)).toBe(`${'x'.repeat(17)}...`);
      expect(Helpers.cutLongStrings(JSON.stringify({ a: 'y'.repeat(100) }), 30)).toEqual({ a: 'yyyyyyy...' });
      expect(Helpers.cutLongStrings({ a: 1 }, 80)).toEqual({ a: 1 });
      expect(Helpers.cutLongStrings({ a: ['z'.repeat(200)], b: 'w'.repeat(200) } as any, 40)).toBeDefined();
      expect(Helpers.cutLongStrings(5 as any)).toBe(5);
    });

    it('prepareAxiosErrorToLog describes axios errors only', async () => {
      app.nock(NOTIFIER_URL).get('/fail').reply(500, { reason: 'test' });
      const error = await HttpRequest.send({ url: `${NOTIFIER_URL}/fail`, method: 'GET' }).catch((e) => e);
      expect(Helpers.prepareAxiosErrorToLog(error, { withHeaders: true })).toMatchObject({
        status: 500,
        method: 'GET',
        responseData: { reason: 'test' },
      });
      expect(Helpers.prepareAxiosErrorToLog(new Error('plain'))).toEqual({ error: 'Error: plain' });
    });
  });

  describe('Controller helpers', () => {
    it('reads user data from the request and answers errors without leaking internals', () => {
      const controller = new Controller();
      const req = {
        authUserInfo: { userId: 'u1', services: { eds: { data: { pem: 'PEM' } } } },
        authAccessToken: 'tok',
        authUserRoles: ['admin'],
        basicAuthUser: 'svc',
        authUserUnitEntities: {
          head: [{ id: 1, name: 'one', allowTokens: ['a'] }],
          member: [{ id: 2, name: 'two', allowTokens: ['a', 'b'] }],
          all: [
            { id: 1, name: 'one', allowTokens: ['a'] },
            { id: 2, name: 'two', allowTokens: ['a', 'b'] },
          ],
        },
      };

      expect(controller.getRequestUserInfo(req)).toBe(req.authUserInfo);
      expect(controller.getRequestUserId(req)).toBe('u1');
      expect(controller.getRequestExternalUser(req)).toBe('svc');
      expect(controller.getRequestUserRoles(req)).toEqual(['admin']);
      expect(controller.getRequestUserAccessToken(req)).toBe('tok');
      expect(controller.getRequestUserEds(req)).toEqual({ data: { pem: 'PEM' } });
      expect(controller.getRequestUserEdsPem(req)).toBe('PEM');
      expect(controller.getRequestUserUnits(req)).toEqual({ head: ['one'], member: ['two'], all: ['one', 'two'] });
      expect(controller.getRequestUserUnitIds(req)).toEqual({ head: [1], member: [2], all: [1, 2] });
      expect(controller.getRequestUserUnitIds({})).toEqual({ head: [], member: [], all: [] });
      expect(controller.isRequestUserUnitHead(req, 1)).toBe(true);
      expect(controller.isRequestUserUnitHead(req, 2)).toBe(false);
      expect(controller.getRequestUserUnitAllowTokens(req)).toEqual(['a', 'b']);
      expect(controller.getRequestUserEdsPem({})).toBeFalsy();
    });

    it('responseError hides the text of unexpected errors', () => {
      const controller = new Controller();
      const send = jest.fn();
      const res: any = { status: jest.fn().mockReturnValue({ send }) };

      controller.responseError(res, new Error('SELECT secret FROM users'));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(JSON.stringify(send.mock.calls[0][0])).not.toContain('SELECT');

      controller.responseError(res, null, 400);
      controller.responseError(res);
      expect(send.mock.calls[2][0].error.message).toBe('Server error.');
    });
  });
});
