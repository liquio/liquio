import http from 'node:http';
import { AddressInfo } from 'node:net';

import { TestApp, TEST_ADMIN, TEST_AUTH_HEADER } from './test-app';

const ID_API = 'http://id-api:8080';
const SMS_GATE = 'http://sms-gate.example.test';

describe('Health checks, admin queue and internal gates', () => {
  let app: TestApp;
  let config: any;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    config = require('../src/config/config');
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
    await TestApp.afterEach();
  });

  describe('GET /test/ping_with_auth?health_check=true', () => {
    const PING = 'http://id-ping.example.test';
    const PLINK = 'http://plink-ping.example.test';
    let saved: any;

    beforeEach(() => {
      saved = { pingRoutes: config.conf.pingRoutes, customer: config.conf.customer, environment: config.conf.environment };
      config.conf.pingRoutes = { authService: `${PING}/test/ping`, persistLink: `${PLINK}/test/ping` };
      config.conf.customer = 'liquio';
      config.conf.environment = 'dev';
    });
    afterEach(() => {
      Object.assign(config.conf, saved);
    });

    const ping = () => app.request().get('/test/ping_with_auth').query({ health_check: 'true' }).set('Authorization', TEST_AUTH_HEADER).expect(200);

    it('reports correct connections to id and persist-link', async () => {
      const headers = { version: '9.9.9', customer: 'liquio', environment: 'dev' };
      app.nock(PING).get('/test/ping_with_auth').reply(200, { message: 'pong' }, headers);
      app
        .nock(PLINK)
        .get('/test/ping')
        .reply(200, { data: { message: 'pong' } }, headers);
      const res = await ping();
      expect(res.body).toMatchObject({ message: 'pong', correctAuthServiceConnection: true, correctPeristLinkConnection: true });
      expect(res.body.authServiceMeta).toBeUndefined();
      expect(res.body.pLinkMeta).toBeUndefined();
    });

    it('reports version, customer and environment mismatches', async () => {
      const headers = { version: '0.0.1', customer: 'other', environment: 'prod' };
      app.nock(PING).get('/test/ping_with_auth').reply(200, { message: 'pong' }, headers);
      app.nock(PLINK).get('/test/ping').reply(200, { message: 'pong' }, headers);
      const res = await ping();
      expect(res.body.correctAuthServiceConnection).toBe('false');
      expect(res.body.authServiceMeta).toEqual({ versionEquality: false, customerEquality: false, environmentEquality: false });
      expect(res.body.pLinkMeta).toEqual({ versionEquality: false, customerEquality: false, environmentEquality: false });
    });

    it.each([
      ['equal version', '0.7.2'],
      ['higher minor', '0.8.0'],
      ['lower minor', '0.6.9'],
      ['higher patch', '0.7.3'],
      ['lower patch', '0.7.1'],
      ['lower major', '-1.0.0'],
    ])('checks the minimum version (%s)', async (_name, version) => {
      const headers = { version, customer: 'liquio', environment: 'dev' };
      app.nock(PING).get('/test/ping_with_auth').reply(200, { message: 'pong' }, headers);
      app.nock(PLINK).get('/test/ping').reply(200, { message: 'pong' }, headers);
      const res = await ping();
      const equal = ['0.7.2', '0.8.0', '0.7.3'].includes(version);
      expect(res.body.correctAuthServiceConnection === true).toBe(equal);
    });

    it('reports unavailable services', async () => {
      app.nock(PING).get('/test/ping_with_auth').reply(500, {});
      app.nock(PLINK).get('/test/ping').replyWithError('connection refused');
      const res = await ping();
      expect(res.body.correctAuthServiceConnection).toBe('false');
      expect(res.body.authServiceMeta).toEqual({ error: 'unavailable' });
      expect(res.body.pLinkMeta).toEqual({ error: 'unavailable' });
    });

    it('rejects an unknown service name', async () => {
      const controller = new (require('../src/controllers/test').TestController)({ use: () => undefined });
      await expect(controller.sendPingRequest('unknown')).rejects.toThrow('Not correct service name');
    });

    it('answers false when the minimum version can not be compared', async () => {
      const controller = new (require('../src/controllers/test').TestController)({ use: () => undefined });
      expect(controller.checkServiceVersion('id', undefined)).toBe(false);
    });
  });

  describe('admin panel queue API', () => {
    const login = async () => {
      const res = await app.request().post('/admin/login').type('form').send({ login: TEST_ADMIN.login, pass: TEST_ADMIN.password });
      return res.headers['set-cookie'][0];
    };

    it('redirects anonymous users and serves queue data to a logged in admin', async () => {
      await app.request().get('/admin/api/queue').expect(302);
      await app.request().get('/admin/api/queue/count').expect(302);
      await app.request().get('/admin/api/log').expect(302);

      const cookie = await login();
      await app.request().get('/admin/api/queue').set('Cookie', cookie).expect(200);
      await app.request().get('/admin/api/queue/count').set('Cookie', cookie).expect(200);
      await app.request().get('/admin/api/log').query({ phone: '+380501112233' }).set('Cookie', cookie).expect(200);
      await app.request().get('/admin/queue').set('Cookie', cookie).expect(200);
      await app.request().get('/admin/logs').set('Cookie', cookie).expect(200);
      await app.request().get('/admin/navbar').set('Cookie', cookie).expect(200);
    });

    it('runs the confirmed queue actions and rejects the unconfirmed ones', async () => {
      const cookie = await login();
      const post = (route: string, body: any = {}) => app.request().post(route).set('Cookie', cookie).send(body);
      await post('/admin/api/queue/clear/abc').expect(400);
      await post('/admin/api/queue/resend/abc').expect(400);
      await post('/admin/api/queue/resend-all').expect(400);
      await post('/admin/api/queue/clear/12345').expect(200);
      await post('/admin/api/queue/resend/12345').expect(200);
      await post('/admin/api/queue/clear-all', { confirm: true }).expect(200);
      await post('/admin/api/queue/resend-all', { confirm: true }).expect(200);
    });

    it('answers 500 when the queue storage fails', async () => {
      const cookie = await login();
      const { connection } = require('../src/models/DB');
      jest.spyOn(connection, 'query').mockRejectedValue(new Error('db down'));
      const post = (route: string, body: any = {}) => app.request().post(route).set('Cookie', cookie).send(body);
      await post('/admin/api/queue/clear/12345').expect(500);
      await post('/admin/api/queue/resend/12345').expect(500);
      await post('/admin/api/queue/clear-all', { confirm: true }).expect(500);
      await post('/admin/api/queue/resend-all', { confirm: true }).expect(500);
    });
  });

  describe('access token validation', () => {
    it('validates the token against id-api and caches the user', async () => {
      const { Auth } = require('../src/models/authServer');
      const auth = new Auth();
      app.nock(ID_API).get('/user/info').query({ access_token: 'tok-1' }).reply(200, { userId: 'u-token', services: {} });
      expect((await auth.checkToken('tok-1'))._id).toBe('u-token');
      expect((await auth.checkToken('tok-1'))._id).toBe('u-token');

      auth.cache['tok-1'].expiredAt = 0;
      app.nock(ID_API).get('/user/info').query({ access_token: 'tok-1' }).reply(200, { userId: 'u-token-2' });
      expect((await auth.checkToken('tok-1'))._id).toBe('u-token-2');
    });

    it('rejects a token for which id-api returns no user', async () => {
      const { Auth } = require('../src/models/authServer');
      app.nock(ID_API).get('/user/info').query({ access_token: 'tok-bad' }).reply(200, {});
      await expect(new Auth().checkToken('tok-bad')).rejects.toThrow();
    });

    it('looks users up by ipn and removes their passwords', async () => {
      const { Auth } = require('../src/models/authServer');
      app
        .nock(ID_API)
        .post('/user/info/ipn')
        .reply(200, [{ userId: 'u-ipn', password: 'secret' }]);
      const users = await new Auth().getUsersInfoByIpn(['1234567890']);
      expect(users).toEqual([{ userId: 'u-ipn', _id: 'u-ipn' }]);
    });
  });

  describe('AbstractGate', () => {
    let gate: any;
    let savedSmsServer: any;
    let savedCrypto: any;

    beforeEach(() => {
      const { AbstractGate } = require('../src/models/smsGate/abstractSmsGate');
      gate = new AbstractGate();
      gate.options = {};
      savedSmsServer = config.smsServer;
      savedCrypto = (global as any).crypto;
      config.smsServer = { url: SMS_GATE, access_token: 'gate-token' };
      (global as any).crypto = require('node:crypto');
    });
    afterEach(() => {
      config.smsServer = savedSmsServer;
      (global as any).crypto = savedCrypto;
    });

    it('sends one SMS and rejects an empty phone', async () => {
      app.nock(SMS_GATE).post('/Subscribe/SendSmsQ.php').reply(200, 'ok');
      const res = await gate.sendOneSms('+380501112233', 'hi');
      expect(res.status).toBe(200);
      await expect(gate.sendOneSms('', 'hi')).rejects.toMatchObject({ errorCode: 400 });
    });

    it('sends SMS to a few phones and splits big lists into batches of 100', async () => {
      app.nock(SMS_GATE).post('/Subscribe/SendSmsQ.php').reply(200, 'ok');
      await gate.sendSms(['+380501112233', '', '+380509998877'], 'hi');

      const phones = Array.from({ length: 150 }, (_, i) => `+3805000${String(i).padStart(5, '0')}`);
      app.nock(SMS_GATE).post('/Subscribe/SendSmsQ.php').times(2).reply(200, 'ok');
      const results = await gate.sendSms(phones, 'hi');
      expect(results).toHaveLength(2);
    });

    it('rethrows gateway errors', async () => {
      app.nock(SMS_GATE).post('/Subscribe/SendSmsQ.php').times(2).reply(500, 'fail');
      await expect(gate.sendOneSms('+380501112233', 'hi')).rejects.toThrow();
      await expect(gate.sendSms(['+380501112233'], 'hi')).rejects.toThrow();
      app.nock(SMS_GATE).post('/Subscribe/SendSmsQ.php').times(2).reply(500, 'fail');
      await expect(
        gate.sendSms(
          Array.from({ length: 101 }, (_, i) => `+38050000${String(i).padStart(4, '0')}`),
          'hi',
        ),
      ).rejects.toThrow();
    });

    it('reads queue, counter and log from the gateway with its bearer token', async () => {
      app
        .nock(SMS_GATE, { reqheaders: { authorization: 'Bearer gate-token' } })
        .get('/Subscribe/SmsQLog.php')
        .reply(200, { q: 1 });
      app.nock(SMS_GATE).get('/Subscribe/SmsQCount.php').reply(200, { count: 1 });
      app.nock(SMS_GATE).get('/Subscribe/SmsLog.php').query(true).reply(200, { log: 1 });
      app.nock(SMS_GATE).get('/Subscribe/SmsLog.php').reply(200, { log: 2 });
      expect((await gate.getSMSQueue()).data).toEqual({ q: 1 });
      expect((await gate.getSMSQueueCounter()).data).toEqual({ count: 1 });
      expect((await gate.getSMSLog('+380501112233')).data).toEqual({ log: 1 });
      expect((await gate.getSMSLog()).data).toEqual({ log: 2 });

      app.nock(SMS_GATE).get('/Subscribe/SmsQLog.php').reply(500, {});
      app.nock(SMS_GATE).get('/Subscribe/SmsQCount.php').reply(500, {});
      app.nock(SMS_GATE).get('/Subscribe/SmsLog.php').reply(500, {});
      await expect(gate.getSMSQueue()).rejects.toThrow();
      await expect(gate.getSMSQueueCounter()).rejects.toThrow();
      await expect(gate.getSMSLog()).rejects.toThrow();
    });

    it('uses a custom TLS agent when the gateway has TLS options', async () => {
      config.smsServer = {
        url: SMS_GATE,
        access_token: 't',
        tls: { rejectUnauthorized: false, ca: '-----BEGIN CERTIFICATE-----\nZm9v\n-----END CERTIFICATE-----' },
      };
      app.nock(SMS_GATE).get('/Subscribe/SmsQCount.php').reply(200, {});
      await gate.getSMSQueueCounter();
    });

    it('reports every phone as skipped when SMS is disabled', async () => {
      config.smsServer = { isEnabled: false };
      expect(await gate.sendSms(['+380501112233'], 'hi')).toEqual([{ skipped: true, reason: 'SMS is disabled in config.', target: '+380501112233' }]);
      expect(await gate.sendOneSms('+380501112233', 'hi')).toMatchObject({ skipped: true });
    });

    it('refuses to remove or retry without an id', async () => {
      await expect(gate.removeFromQueue()).rejects.toThrow('sms_id is required');
      await expect(gate.retrySendInQueue()).rejects.toThrow('sms_id is required');
    });
  });

  describe('helpers', () => {
    it('detects value types', () => {
      const { typeOf } = require('../src/lib/type_of');
      expect([typeOf({}), typeOf([]), typeOf(null), typeOf('s'), typeOf(1), typeOf(new Set())]).toEqual([
        'object',
        'array',
        'null',
        'string',
        'number',
        'set',
      ]);
    });

    it('cuts long strings in logged values', () => {
      const { Helpers } = require('../src/lib/helpers');
      expect(Helpers.cutLongStrings('a'.repeat(100))).toHaveLength(80);
      expect(Helpers.cutLongStrings('short')).toBe('short');
      expect(Helpers.cutLongStrings(5)).toBe(5);
      expect(Helpers.cutLongStrings(JSON.stringify({ a: 'b' }))).toEqual({ a: 'b' });
      const cut: any = Helpers.cutLongStrings({ a: 'x'.repeat(500), b: ['y'.repeat(500)], c: 1 }, 60);
      expect(JSON.stringify(cut).length).toBeLessThanOrEqual(60);
      const huge: any = Helpers.cutLongStrings({ list: Array.from({ length: 50 }, () => 'z'.repeat(50)) }, 40);
      expect(huge).toBeDefined();
      const big: any = Helpers.cutLongStrings({ a: 'q'.repeat(5000), b: 'w'.repeat(5000) }, 2000);
      expect(JSON.stringify(big).length).toBeLessThanOrEqual(2000);
    });

    it('transliterates text', () => {
      const translit = require('../src/models/translitModel').default;
      expect(translit('Crème Brûlée Ä Ö Ü ß ñ')).toBe('Creme Brulee A O U ss n');
      expect(translit(12345)).toBe('12345');
    });

    it('defines the mail queue model', () => {
      const { MailQueueModel } = require('../src/models/mail_queue');
      expect(new MailQueueModel().MailQueue.tableName).toBe('mail_queue');
    });

    it('creates a plain http server for an express app', async () => {
      const { createServer } = require('../src/lib/tls_server');
      const server: http.Server = createServer((_req: any, res: any) => res.end('plain'));
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const { port } = server.address() as AddressInfo;
      const body = await new Promise<string>((resolve, reject) => {
        http
          .get({ host: '127.0.0.1', port, path: '/' }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve(data));
          })
          .on('error', reject);
      });
      await new Promise((resolve) => server.close(resolve));
      expect(body).toBe('plain');
    });
  });
});
