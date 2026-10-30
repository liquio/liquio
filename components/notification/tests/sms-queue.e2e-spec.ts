import { TestApp, TEST_AUTH_HEADER, TEST_SERVICE } from './test-app';
import { getExtensions } from '../src/lib/context';

describe('SMS queue, gate and callbacks', () => {
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
    await TestApp.afterEach();
  });

  const seedQueue = async (count: number) => {
    const { IncommingMessagesModel } = require('../src/models/incomming_messages');
    const { SmsQueueModel } = require('../src/models/sms_queue');
    const message = await new IncommingMessagesModel().IncommingMessages.create({ title_message: 'queue' });
    const SmsQueue = new SmsQueueModel().SmsQueue;
    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push(await SmsQueue.create({ message_id: message.message_id, phone: `+3805000000${i}` }));
    }
    return { SmsQueue, rows };
  };

  it('requires Basic auth on every queue route', async () => {
    await app.request().get('/queue').expect(401);
    await app.request().get('/queue/count').expect(401);
    await app.request().get('/queue/log').expect(401);
    await app.request().post('/queue/clear-all').expect(401);
    await app.request().post('/queue/clear/1').expect(401);
    await app.request().post('/queue/resend-all').expect(401);
    await app.request().post('/queue/resend/1').expect(401);
  });

  describe('adapter without queue support (test console adapter)', () => {
    it('answers an empty body for queue, count and log', async () => {
      await authed(app.request().get('/queue')).expect(200);
      await authed(app.request().get('/queue/count')).expect(200);
      await authed(app.request().get('/queue/log')).query({ phone: TEST_SERVICE.phones[0] }).expect(200);
    });
  });

  describe('adapter with queue support', () => {
    const adapter = {
      selfBind: false,
      sendSms: jest.fn(async (phones: string[]) => phones.map(() => 'ok')),
      sendOneSms: jest.fn(async () => 'ok-one'),
      getSMSQueue: jest.fn(async () => ({ items: ['q'] })),
      getSMSQueueCounter: jest.fn(async () => ({ count: 7 })),
      getSMSLog: jest.fn(async (phone: string) => ({ log: [phone] })),
    };
    let saved: any;

    beforeAll(() => {
      saved = getExtensions().adapters.sms;
      getExtensions().adapters.sms = adapter;
    });
    afterAll(() => {
      getExtensions().adapters.sms = saved;
    });

    it('proxies queue, count and log to the adapter', async () => {
      expect((await authed(app.request().get('/queue')).expect(200)).body).toEqual({ items: ['q'] });
      expect((await authed(app.request().get('/queue/count')).expect(200)).body).toEqual({ count: 7 });
      expect((await authed(app.request().get('/queue/log')).query({ phone: '+380501112233' }).expect(200)).body).toEqual({
        log: ['+380501112233'],
      });
    });

    it('validates sms_id and the confirm flag', async () => {
      await authed(app.request().post('/queue/clear/abc')).expect(400);
      await authed(app.request().post('/queue/clear/0')).expect(400);
      await authed(app.request().post('/queue/resend/99999999999')).expect(400);
      await authed(app.request().post('/queue/clear-all')).send({}).expect(400);
      await authed(app.request().post('/queue/resend-all')).send({ confirm: 'yes' }).expect(400);
    });

    it('removes and retries a single queue entry', async () => {
      const { SmsQueue, rows } = await seedQueue(3);
      const res = await authed(app.request().post(`/queue/clear/${rows[0].sms_id}`)).expect(200);
      expect(res.body).toEqual({ count: 7, queue: { items: ['q'] } });
      expect(await SmsQueue.count({ where: { sms_id: rows[0].sms_id } })).toBe(0);

      await authed(app.request().post(`/queue/resend/${rows[1].sms_id}`)).expect(200);
      expect(await SmsQueue.count({ where: { sms_id: rows[1].sms_id } })).toBe(0);
      expect(await SmsQueue.count({ where: { sms_id: rows[2].sms_id } })).toBe(1);
    });

    it('clears and resends the whole queue only with confirm: true', async () => {
      const { SmsQueue } = await seedQueue(2);
      await authed(app.request().post('/queue/resend-all')).send({ confirm: true }).expect(200);
      expect(await SmsQueue.count()).toBe(0);

      await seedQueue(2);
      await authed(app.request().post('/queue/clear-all')).send({ confirm: true }).expect(200);
      expect(await SmsQueue.count()).toBe(0);
    });

    it('answers 500 when the queue storage fails', async () => {
      await seedQueue(1);
      const { connection } = require('../src/models/DB');
      const spy = jest.spyOn(connection, 'query').mockRejectedValue(new Error('db down'));
      try {
        await authed(app.request().post('/queue/clear/1')).expect(500);
        await authed(app.request().post('/queue/clear-all')).send({ confirm: true }).expect(500);
        await authed(app.request().post('/queue/resend/1')).expect(500);
        await authed(app.request().post('/queue/resend-all')).send({ confirm: true }).expect(500);
      } finally {
        spy.mockRestore();
      }
    });

    it('sends SMS through the adapter for several and for one phone', async () => {
      const { CustomGate } = require('../src/models/smsGate/customGate');
      const gate = new CustomGate();
      expect(await gate.sendSms(['+380500000001', '+380500000002'], 'text')).toEqual(['ok', 'ok']);
      expect(await gate.sendOneSms('+380500000001', 'text')).toBe('ok-one');
      adapter.sendSms.mockRejectedValueOnce(new Error('gateway down'));
      expect(await gate.sendSms(['+380500000001'], 'text')).toBeUndefined();
      adapter.sendOneSms.mockRejectedValueOnce(new Error('gateway down'));
      expect(await gate.sendOneSms('+380500000001', 'text')).toBeUndefined();
      adapter.getSMSQueue.mockRejectedValueOnce(new Error('gateway down'));
      expect(await gate.getSMSQueue()).toBeUndefined();
      adapter.getSMSQueueCounter.mockRejectedValueOnce(new Error('gateway down'));
      expect(await gate.getSMSQueueCounter()).toBeUndefined();
      adapter.getSMSLog.mockRejectedValueOnce(new Error('gateway down'));
      expect(await gate.getSMSLog('+380500000001')).toBeUndefined();
    });
  });

  describe('adapter without any methods', () => {
    it('returns nothing from every gate method', async () => {
      const saved = getExtensions().adapters.sms;
      getExtensions().adapters.sms = {};
      try {
        const { CustomGate } = require('../src/models/smsGate/customGate');
        const gate = new CustomGate();
        expect(await gate.sendSms(['+380500000001'], 't')).toBeUndefined();
        expect(await gate.sendOneSms('+380500000001', 't')).toBeUndefined();
        expect(await gate.getSMSQueue()).toBeUndefined();
        expect(await gate.getSMSQueueCounter()).toBeUndefined();
        expect(await gate.getSMSLog('+380500000001')).toBeUndefined();
      } finally {
        getExtensions().adapters.sms = saved;
      }
    });
  });

  describe('SMS disabled in config', () => {
    it('reports every phone as skipped', async () => {
      const { CustomGate } = require('../src/models/smsGate/customGate');
      const gate = new CustomGate();
      const spy = jest.spyOn(CustomGate.prototype, 'isEnabled', 'get').mockReturnValue(false);
      try {
        expect(await gate.sendSms(['+380500000001'], 't')).toEqual([
          { skipped: true, reason: 'SMS is disabled in config.', target: '+380500000001' },
        ]);
        expect(await gate.sendOneSms('+380500000001', 't')).toMatchObject({ skipped: true });
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('POST /message/sms/callback/', () => {
    it('removes the queue entry when the gateway reports status 2', async () => {
      const { SmsQueue, rows } = await seedQueue(1);
      const res = await app.request().post('/message/sms/callback/').send({ message_id: rows[0].sms_id, status: 2 }).expect(200);
      expect(res.body).toHaveProperty('removed');
      expect(await SmsQueue.count({ where: { sms_id: rows[0].sms_id } })).toBe(0);
    });

    it('ignores other statuses', async () => {
      await app.request().post('/message/sms/callback/').send({ message_id: 1, status: 1 }).expect(200);
    });

    it('answers an error body when message_id is missing', async () => {
      const res = await app.request().post('/message/sms/callback/').send({ status: 2 });
      expect(res.status).toBe(500);
    });
  });

  describe('GET /message/senderErrorCallback', () => {
    it('answers an error for an unknown id', async () => {
      const res = await app.request().get('/message/senderErrorCallback').query({ id: 'unknown' });
      expect(res.status).toBe(500);
    });
  });
});
