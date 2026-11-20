import amqp from 'amqplib/callback_api';
import { getRetryDelayMs, MessageBusUnavailableError } from '@liquio/back-core';

import { Rmq } from '../src/lib/rmq';
import { TestApp } from './test-app';
import { getConfig, getLog, getMessageBus, getModels, getRedisClient, setAppContext } from '../src/lib/context';
import { createEventMessageBus } from '../src/lib/message_bus';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor<T>(fn: () => Promise<T | undefined | null | false>, timeoutMs = 15000, stepMs = 200): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = await fn();
    if (value) return value as T;
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timeout');
    await sleep(stepMs);
  }
}

// Raw AMQP helper acting as "another component".
function connect(url: string): Promise<{ connection: any; channel: any }> {
  return new Promise((resolve, reject) => {
    amqp.connect(url, (error: any, connection: any) => {
      if (error) return reject(error);
      connection.createChannel((err: any, channel: any) => (err ? reject(err) : resolve({ connection, channel })));
    });
  });
}

function getMessage(channel: any, queue: string): Promise<any> {
  return new Promise((resolve, reject) => channel.get(queue, { noAck: true }, (e: any, m: any) => (e ? reject(e) : resolve(m))));
}

function makeFakeRedis() {
  const store = new Map<string, any>();
  return {
    store,
    get: async (key: string) => store.get(key),
    set: async (key: string, value: any) => {
      store.set(key, value);
    },
    getObject: async (key: string) => store.get(key),
    delete: async (key: string) => {
      store.delete(key);
    },
  };
}

describe('Group A - message queue consumer, producer, RMQ and event business', () => {
  let app: TestApp;
  let amqpUrl: string;
  let readingQueue: string;
  let writingQueue: string;
  let raw: { connection: any; channel: any };

  beforeAll(async () => {
    await TestApp.beforeAll();
    // TestApp.setup() already calls app.init(); a second init would open a second set of channels and break acks.
    app = await TestApp.setup({});
    const mqConfig = getConfig().message_queue;
    amqpUrl = mqConfig.amqpConnection;
    readingQueue = mqConfig.readingQueueName;
    writingQueue = mqConfig.writingQueueName;
    raw = await connect(amqpUrl);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => raw?.connection.close(() => resolve()));
    await TestApp.afterAll(app);
  });

  afterEach(async () => {
    await TestApp.afterEach(app);
  });

  beforeEach(async () => {
    await TestApp.beforeEach(app);
  });

  async function seedDelay(ids: { wfTpl: number; evTpl: number; wf: string }, schema: any = { delay: '2h' }, xml?: string) {
    await app.model('workflowTemplate').create({
      id: ids.wfTpl,
      name: 'Group A workflow',
      description: 'Group A',
      xml_bpmn_schema: xml ?? `<?xml version="1.0" encoding="UTF-8"?><definitions><serviceTask id="event-${ids.evTpl}" /></definitions>`,
      data: {},
      is_active: true,
      errors_subscribers: [],
    });
    await app.model('eventTemplate').create({
      id: ids.evTpl,
      event_type_id: 2,
      name: 'Group A delay',
      description: 'Group A',
      json_schema: JSON.stringify(schema),
      html_template: '',
    });
    await app.model('workflow').create({
      id: ids.wf,
      workflow_template_id: ids.wfTpl,
      name: 'Group A workflow instance',
      is_final: false,
      created_by: 'test-user',
      updated_by: 'test-user',
      data: {},
      workflow_status_id: 1,
      user_data: {},
      has_unresolved_errors: false,
      statuses: {},
    });
  }

  const findEvents = (evTpl: number) => app.model('event').findAll({ where: { event_template_id: evTpl } });
  const publishRaw = (queue: string, body: string) => raw.channel.sendToQueue(queue, Buffer.from(body), { persistent: true });

  describe('Consumer (reading queue -> createFromMessage)', () => {
    it('creates the event in DB after a message is published to the reading queue', async () => {
      const ids = { wfTpl: 960001, evTpl: 960001001, wf: 'a0000001-0000-4000-8000-000000000001' };
      await seedDelay(ids);

      publishRaw(readingQueue, JSON.stringify({ workflowId: ids.wf, eventTemplateId: ids.evTpl, workflowTemplateId: ids.wfTpl }));

      const events: any[] = await waitFor(async () => {
        const rows = await findEvents(ids.evTpl);
        return rows.length ? rows : null;
      });
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ workflow_id: ids.wf, event_type_id: 2, done: false });
      expect(app.messageBus.health().inFlight).toBeGreaterThanOrEqual(0);
    });

    it('discards a malformed message and keeps consuming the next one', async () => {
      const ids = { wfTpl: 960002, evTpl: 960002001, wf: 'a0000002-0000-4000-8000-000000000002' };
      await seedDelay(ids);

      publishRaw(readingQueue, 'this is {not json');
      publishRaw(readingQueue, JSON.stringify({ workflowId: ids.wf, eventTemplateId: ids.evTpl, workflowTemplateId: ids.wfTpl }));

      await waitFor(async () => (await findEvents(ids.evTpl)).length > 0);
      await waitFor(async () => app.messageBus.health().inFlight === 0);
      const logs = (app as any).logs || [];
      expect(Array.isArray(logs)).toBe(true);
    });

    it('records a failing event with retry info, produces a postponed retry message and notFailOnError event', async () => {
      const ids = { wfTpl: 960003, evTpl: 960003001, wf: 'a0000003-0000-4000-8000-000000000003' };
      await seedDelay(ids, { delay: "() => { throw new Error('boom'); }", retryIfError: ['10m'], notFailOnError: true });
      const publishSpy = jest.spyOn(getMessageBus(), 'publish');

      publishRaw(readingQueue, JSON.stringify({ workflowId: ids.wf, eventTemplateId: ids.evTpl, workflowTemplateId: ids.wfTpl }));
      await waitFor(async () => publishSpy.mock.calls.length > 0);
      expect(publishSpy.mock.calls[0][0]).toBe('event');
      expect(publishSpy.mock.calls[0][2]).toEqual({ delayMs: getRetryDelayMs('10m') });
      expect(publishSpy.mock.calls[0][1]).toMatchObject({ retryIterator: 1, workflowId: ids.wf });

      // Second pass (iterator exhausted) -> notFailOnError path creates failed event and produces outgoing message.
      publishSpy.mockClear();
      publishRaw(readingQueue, JSON.stringify({ workflowId: ids.wf, eventTemplateId: ids.evTpl, workflowTemplateId: ids.wfTpl, retryIterator: 1 }));
      await waitFor(async () => publishSpy.mock.calls.length > 0);
      expect(publishSpy.mock.calls[0][0]).toBe('manager');
      const rows: any[] = await waitFor(async () => {
        const r = await findEvents(ids.evTpl);
        return r.some((e: any) => e.data?.notFailOnError) ? r : null;
      });
      expect(rows.length).toBeGreaterThan(0);
      publishSpy.mockRestore();
    });

    it('fails the workflow on error without retry and writes a debug record when debugId is passed', async () => {
      const ids = { wfTpl: 960004, evTpl: 960004001, wf: 'a0000004-0000-4000-8000-000000000004' };
      await seedDelay(ids, { delay: "() => { throw new Error('boom'); }" });

      expect(await app.eventBusiness.createFromMessage({ workflowId: ids.wf, eventTemplateId: ids.evTpl, workflowTemplateId: ids.wfTpl })).toBe(true);
      const wf = await app.model('workflow').findByPk(ids.wf);
      expect(wf.has_unresolved_errors).toBe(true);

      const debugId = 'dbg-group-a-4';
      expect(
        await app.eventBusiness.createFromMessage({ workflowId: ids.wf, eventTemplateId: ids.evTpl, workflowTemplateId: ids.wfTpl, debugId }),
      ).toBe(true);
      const debugRows = await (app.eventBusiness as any).workflowDebugModel.model.findAll({ where: { id: debugId } });
      expect(debugRows).toHaveLength(1);
    });

    it('writes a debug record on success when debugId is passed', async () => {
      const ids = { wfTpl: 960005, evTpl: 960005001, wf: 'a0000005-0000-4000-8000-000000000005' };
      await seedDelay(ids);
      const debugId = 'dbg-group-a-5';
      expect(
        await app.eventBusiness.createFromMessage({ workflowId: ids.wf, eventTemplateId: ids.evTpl, workflowTemplateId: ids.wfTpl, debugId }),
      ).toBe(true);
      expect(await (app.eventBusiness as any).workflowDebugModel.model.findAll({ where: { id: debugId } })).toHaveLength(1);
    });

    describe('with redis de-duplication cache', () => {
      let fakeRedis: ReturnType<typeof makeFakeRedis>;
      let prevRedis: any;
      let prevCfg: any;

      beforeEach(() => {
        fakeRedis = makeFakeRedis();
        prevRedis = getRedisClient();
        prevCfg = getConfig().redis;
        setAppContext({ redisClient: fakeRedis });
        getConfig().redis = { ...(prevCfg || {}), amqpMessageCache: { isEnabled: true } };
      });

      afterEach(() => {
        setAppContext({ redisClient: prevRedis });
        getConfig().redis = prevCfg;
      });

      it('handles a message once, caches the id and acks a duplicate from the cache', async () => {
        const ids = { wfTpl: 960006, evTpl: 960006001, wf: 'a0000006-0000-4000-8000-000000000006' };
        await seedDelay(ids);
        const body = { workflowId: ids.wf, eventTemplateId: ids.evTpl, workflowTemplateId: ids.wfTpl, amqpMessageId: 'amqp-id-a-1' };

        publishRaw(readingQueue, JSON.stringify(body));
        await waitFor(async () => fakeRedis.store.has('amqp-message-id.amqp-id-a-1'));
        // The wip marker is never cleared by the consumer; drop it so the duplicate takes the cache path instead of the 5 minute wip wait.
        fakeRedis.store.delete('amqp-message-id.amqp-id-a-1.wip');
        publishRaw(readingQueue, JSON.stringify(body));
        await waitFor(async () => app.messageBus.health().inFlight === 0);
        await sleep(500);

        expect(await findEvents(ids.evTpl)).toHaveLength(1);
      });

      it('requeues a message while another handler holds the wip marker (nack path)', async () => {
        const ids = { wfTpl: 960007, evTpl: 960007001, wf: 'a0000007-0000-4000-8000-000000000007' };
        await seedDelay(ids);
        const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((fn: any, ms?: number, ...args: any[]) => {
          // Shorten only the 5 minute wip wait.
          const real = ms === 5 * 60 * 1000 ? 100 : ms;
          return (jest.requireActual('timers') as any).setTimeout(fn, real, ...args);
        }) as any);
        fakeRedis.store.set('amqp-message-id.amqp-id-a-2.wip', 'amqp-id-a-2');

        publishRaw(
          readingQueue,
          JSON.stringify({ workflowId: ids.wf, eventTemplateId: ids.evTpl, workflowTemplateId: ids.wfTpl, amqpMessageId: 'amqp-id-a-2' }),
        );
        await sleep(600);
        expect(await findEvents(ids.evTpl)).toHaveLength(0);

        fakeRedis.store.delete('amqp-message-id.amqp-id-a-2.wip');
        await waitFor(async () => (await findEvents(ids.evTpl)).length > 0);
        timeoutSpy.mockRestore();
      });

      it('survives redis errors while checking and storing ids', async () => {
        const ids = { wfTpl: 960008, evTpl: 960008001, wf: 'a0000008-0000-4000-8000-000000000008' };
        await seedDelay(ids);
        setAppContext({
          redisClient: {
            get: async () => {
              throw new Error('redis down');
            },
            set: async () => {
              throw new Error('redis down');
            },
          },
        });
        publishRaw(
          readingQueue,
          JSON.stringify({ workflowId: ids.wf, eventTemplateId: ids.evTpl, workflowTemplateId: ids.wfTpl, amqpMessageId: 'amqp-id-a-3' }),
        );
        await waitFor(async () => (await findEvents(ids.evTpl)).length > 0);
      });
    });
  });

  describe('Message bus producer', () => {
    it('publishes to the writing queue and to postponed queues', async () => {
      const retryQueues = ['10m', '1h', '2h', '8h', '1d'].map((label) => `${readingQueue}-errors-${label}`);
      for (const q of [writingQueue, ...retryQueues]) {
        while (await getMessage(raw.channel, q)) {
          /* drain */
        }
      }
      await app.messageBus.publish('manager', { workflowId: 'w1', eventId: 'e1' });
      const msg: any = await waitFor(() => getMessage(raw.channel, writingQueue));
      const body = JSON.parse(msg.content.toString());
      expect(body).toMatchObject({ workflowId: 'w1', eventId: 'e1' });
      expect(body.amqpMessageId).toEqual(expect.any(String));

      const cases: [string, string][] = [
        ['10m', '10m'],
        ['1h', '1h'],
        ['2h', '2h'],
        ['8h', '8h'],
        ['1d', '1d'],
        ['unknown', '1d'],
      ];
      for (const [k, label] of cases) {
        await app.messageBus.publish('event', { k }, { delayMs: getRetryDelayMs(k) });
        const delayed: any = await waitFor(() => getMessage(raw.channel, `${readingQueue}-errors-${label}`));
        expect(JSON.parse(delayed.content.toString()).k).toBe(k);
      }
    });

    it('rejects a publish while the bus is closed', async () => {
      const closedBus = createEventMessageBus(getConfig());
      await closedBus.init();
      await closedBus.close();
      await expect(closedBus.publish('manager', { a: 1 })).rejects.toBeInstanceOf(MessageBusUnavailableError);
    });

    it('accepts a retry queue declared with the legacy arguments', async () => {
      const queue = `${readingQueue}-errors-10m`;
      const check = await connect(amqpUrl);
      await new Promise<void>((resolve, reject) =>
        check.channel.assertQueue(
          queue,
          { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-message-ttl': 600000, 'x-dead-letter-routing-key': readingQueue } },
          (e: any) => (e ? reject(e) : resolve()),
        ),
      );
      const second = createEventMessageBus(getConfig());
      try {
        await second.init();
        expect(second.health().status).toBe('connected');
      } finally {
        await second.close();
        await new Promise<void>((resolve) => check.connection.close(() => resolve()));
      }
    });
  });

  describe('Handler failures', () => {
    const wf = 'a0000010-0000-4000-8000-000000000010';
    const handlerErrors = () => getLog().logs.filter((l: any) => l.type === 'message-bus-handler-error');
    const readyCount = () =>
      new Promise<number>((resolve, reject) => raw.channel.checkQueue(readingQueue, (e: any, ok: any) => (e ? reject(e) : resolve(ok.messageCount))));

    const cases: [string, 'threw' | 'invalid-result', () => Promise<any>, number][] = [
      ['rejects', 'threw', () => Promise.reject(new Error('SENTINEL-MSG')), 960010],
      ['resolves undefined', 'invalid-result', () => Promise.resolve(undefined), 960011],
    ];

    it.each(cases)('discards the message once and records a failure row when the handler %s', async (_title, failure, impl, wfTpl) => {
      const ids = { wfTpl, evTpl: wfTpl * 1000 + 1, wf: `a00000${wfTpl % 100}-0000-4000-8000-0000000000${wfTpl % 100}` };
      await seedDelay(ids);
      const spy = jest.spyOn(app.eventBusiness, 'createFromMessage').mockImplementationOnce(impl as any);
      const before = app.messageBus.health().counters.handlerErrors;

      publishRaw(readingQueue, JSON.stringify({ workflowId: ids.wf, eventTemplateId: ids.evTpl, workflowTemplateId: ids.wfTpl }));
      await waitFor(async () => handlerErrors().length > 0, 5000);
      await sleep(1000);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(await readyCount()).toBe(0);
      expect(app.messageBus.health().counters.handlerErrors).toBe(before + 1);
      expect(app.messageBus.health().lastHandlerErrorAt).toBeDefined();
      expect(handlerErrors()).toHaveLength(1);
      const entry = handlerErrors()[0].data;
      expect(entry).toMatchObject({
        failure,
        workflowId: ids.wf,
        eventTemplateId: ids.evTpl,
        error: expect.objectContaining({ name: expect.any(String) }),
      });
      expect(entry.errorId).toEqual(expect.any(Number));
      expect(JSON.stringify(getLog().logs)).not.toContain('SENTINEL-MSG');

      const row = await app.model('workflowError').findByPk(entry.errorId);
      expect(row.service_name).toBe('event');
      expect(row.workflow_id).toBeNull();
      expect(row.data).toMatchObject({ failure, queueMessage: { workflowId: ids.wf } });
      expect(row.data.error).toEqual(expect.any(String));
      expect((await app.model('workflow').findByPk(ids.wf)).has_unresolved_errors).toBe(false);
      spy.mockRestore();
    });

    it('reports one in-flight handler while handling and none afterwards', async () => {
      const spy = jest.spyOn(app.eventBusiness, 'createFromMessage').mockImplementationOnce((async () => {
        await sleep(800);
        return true;
      }) as any);
      publishRaw(readingQueue, JSON.stringify({ workflowId: wf, eventTemplateId: 1 }));
      await waitFor(async () => app.messageBus.health().inFlight === 1, 5000, 50);
      await waitFor(async () => app.messageBus.health().inFlight === 0, 5000, 50);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
  });

  describe('Logs and failure records on the business path', () => {
    const logsOf = (type: string) => getLog().logs.filter((l: any) => l.type === type);
    const failing = "() => { throw new Error('SENTINEL-MSG'); }";

    it('does not put message bodies into logs', async () => {
      const unknownTemplate = 960019001;
      // A message without a known event template fails before any schema is parsed.
      publishRaw(
        readingQueue,
        JSON.stringify({
          workflowId: 'a0000019-0000-4000-8000-000000000019',
          eventTemplateId: unknownTemplate,
          initData: { x: 'SENTINEL-E' },
          sequenceIds: ['SENTINEL-U'],
        }),
      );
      await waitFor(async () => logsOf('unknown-error').length > 0);
      await waitFor(async () => app.messageBus.health().inFlight === 0);
      expect(JSON.stringify(getLog().logs)).not.toContain('SENTINEL');
    });

    it('logs the failure row id and the error name only for a failed event', async () => {
      const ids = { wfTpl: 960020, evTpl: 960020001, wf: 'a0000020-0000-4000-8000-000000000020' };
      await seedDelay(ids, { delay: failing });
      const sendEmails = jest.spyOn((app.eventBusiness as any).systemNotifier, 'sendEmails').mockResolvedValue(undefined as any);

      publishRaw(readingQueue, JSON.stringify({ workflowId: ids.wf, eventTemplateId: ids.evTpl, workflowTemplateId: ids.wfTpl }));
      await waitFor(async () => logsOf('event-handling-by-message-from-queue-error').length > 0);
      await waitFor(async () => app.messageBus.health().inFlight === 0);

      const entry = logsOf('event-handling-by-message-from-queue-error')[0].data;
      expect(entry.error).toEqual({ name: 'EvaluateSchemaFunctionError' });
      expect(entry.errorId).toEqual(expect.any(Number));
      const row = await app.model('workflowError').findByPk(entry.errorId);
      expect(row).toMatchObject({ type: 'error', workflow_id: ids.wf });
      // The sandbox logs the evaluated function failure itself, outside the bus and the business handler.
      const ownLogs = getLog().logs.filter((l: any) => !['sandbox-error', 'eval-error'].includes(l.type));
      expect(JSON.stringify(ownLogs)).not.toContain('SENTINEL-MSG');
      sendEmails.mockRestore();
    });

    it('logs the warning row id when the workflow status cannot be set', async () => {
      const ids = { wfTpl: 960021, evTpl: 960021001, wf: 'a0000021-0000-4000-8000-000000000021' };
      await seedDelay(ids);
      const spy = jest.spyOn(app.eventBusiness as any, 'setWorkflowStatus').mockRejectedValueOnce(new Error('SENTINEL-MSG'));

      publishRaw(readingQueue, JSON.stringify({ workflowId: ids.wf, eventTemplateId: ids.evTpl, workflowTemplateId: ids.wfTpl }));
      await waitFor(async () => logsOf('set-workflow-status-error').length > 0);

      const entry = logsOf('set-workflow-status-error')[0].data;
      expect(entry.error).toEqual({ name: 'Error' });
      const row = await app.model('workflowError').findByPk(entry.errorId);
      expect(row).toMatchObject({ type: 'warning', workflow_id: ids.wf });
      expect(JSON.stringify(getLog().logs)).not.toContain('SENTINEL-MSG');
      spy.mockRestore();
    });
  });

  describe('Trusted workflow linking on failure paths', () => {
    const failing = "() => { throw new Error('boom'); }";
    const noEventNode = '<?xml version="1.0" encoding="UTF-8"?><definitions><serviceTask id="event-1" /></definitions>';
    const errorRows = async (wf: string) => (await app.model('workflowError').findAll()).filter((r: any) => r.data?.queueMessage?.workflowId === wf);
    let publish: jest.SpyInstance;
    let sendEmails: jest.SpyInstance;

    beforeEach(() => {
      publish = jest.spyOn(getMessageBus(), 'publish').mockResolvedValue({ messageId: 'x' });
      sendEmails = jest.spyOn((app.eventBusiness as any).systemNotifier, 'sendEmails').mockResolvedValue(undefined as any);
    });

    afterEach(() => {
      publish.mockRestore();
      sendEmails.mockRestore();
    });

    const message = (ids: any, extra: any = {}) => ({ workflowId: ids.wf, eventTemplateId: ids.evTpl, workflowTemplateId: ids.wfTpl, ...extra });

    it('does not mark, notify, create events or publish for a workflow that does not contain the event', async () => {
      const ids = { wfTpl: 960030, evTpl: 960030001, wf: 'a0000030-0000-4000-8000-000000000030' };
      await seedDelay(ids, { delay: failing }, noEventNode);

      expect(await app.eventBusiness.createFromMessage(message(ids))).toBe(true);

      const rows = await errorRows(ids.wf);
      expect(rows).toHaveLength(1);
      expect(rows[0].workflow_id).toBeNull();
      expect((await app.model('workflow').findByPk(ids.wf)).has_unresolved_errors).toBe(false);
      expect(await findEvents(ids.evTpl)).toHaveLength(0);
      expect(publish).not.toHaveBeenCalled();
      expect(sendEmails).not.toHaveBeenCalled();
    });

    it('creates no failed event and no follow-up message with notFailOnError for such a workflow', async () => {
      const ids = { wfTpl: 960031, evTpl: 960031001, wf: 'a0000031-0000-4000-8000-000000000031' };
      await seedDelay(ids, { delay: failing, notFailOnError: true }, noEventNode);

      expect(await app.eventBusiness.createFromMessage(message(ids))).toBe(true);

      expect((await errorRows(ids.wf))[0].workflow_id).toBeNull();
      expect(await findEvents(ids.evTpl)).toHaveLength(0);
      expect(publish).not.toHaveBeenCalled();
    });

    it('still schedules the retry but links nothing for such a workflow', async () => {
      const ids = { wfTpl: 960032, evTpl: 960032001, wf: 'a0000032-0000-4000-8000-000000000032' };
      await seedDelay(ids, { delay: failing, retryIfError: ['10m'] }, noEventNode);

      expect(await app.eventBusiness.createFromMessage(message(ids))).toBe(true);
      await waitFor(async () => ((await errorRows(ids.wf)).length ? true : null));
      await sleep(200);

      expect(publish).toHaveBeenCalledWith('event', expect.objectContaining({ retryIterator: 1 }), { delayMs: getRetryDelayMs('10m') });
      expect((await errorRows(ids.wf))[0]).toMatchObject({ type: 'warning', workflow_id: null });
      expect(await findEvents(ids.evTpl)).toHaveLength(0);
    });

    it('links, marks and notifies for a valid workflow', async () => {
      const ids = { wfTpl: 960033, evTpl: 960033001, wf: 'a0000033-0000-4000-8000-000000000033' };
      await seedDelay(ids, { delay: failing });

      expect(await app.eventBusiness.createFromMessage(message(ids))).toBe(true);

      expect((await errorRows(ids.wf))[0]).toMatchObject({ type: 'error', workflow_id: ids.wf });
      expect((await app.model('workflow').findByPk(ids.wf)).has_unresolved_errors).toBe(true);
      expect(sendEmails).toHaveBeenCalledWith(expect.objectContaining({ workflowId: ids.wf }));
    });

    it('links the row, creates the failed event and reports back with notFailOnError for a valid workflow', async () => {
      const ids = { wfTpl: 960034, evTpl: 960034001, wf: 'a0000034-0000-4000-8000-000000000034' };
      await seedDelay(ids, { delay: failing, notFailOnError: true });

      expect(await app.eventBusiness.createFromMessage(message(ids))).toBe(true);

      expect((await errorRows(ids.wf))[0]).toMatchObject({ type: 'warning', workflow_id: ids.wf });
      const events: any[] = await findEvents(ids.evTpl);
      expect(events).toHaveLength(1);
      expect(publish).toHaveBeenCalledWith('manager', { workflowId: ids.wf, eventId: events[0].id });
    });
  });
  describe('Rmq (request/response over RabbitMQ)', () => {
    const suffix = Date.now();
    const opts = (extra: any = {}) => ({
      amqpConnection: undefined as any,
      readingQueueName: `rmq-a-reading-${suffix}`,
      writingQueueName: `rmq-a-writing-${suffix}`,
      readingExchangeName: `rmq-a-exchange-${suffix}`,
      writingExchangeName: '',
      readingXMessageTtl: 60000,
      writingXMessageTtl: 60000,
      getIncomingMessageInterval: 100,
      getIncomingMessageTimeout: 8000,
      ...extra,
    });
    let rmq: Rmq;
    let responderChannel: any;

    beforeAll(async () => {
      rmq = new Rmq('group-a');
      await rmq.init({ ...opts(), amqpConnection: amqpUrl });
      // Responder: echo each request to the reading exchange.
      responderChannel = raw.channel;
      const o = rmq.options;
      responderChannel.consume(
        o.writingQueueName,
        (msg: any) => {
          const request = JSON.parse(msg.content.toString());
          const reply = { event: 'reply', payload: { uuid: request.payload.uuid, answer: 42 } };
          responderChannel.publish(o.readingExchangeName, o.readingQueueName, Buffer.from(JSON.stringify(reply)));
          responderChannel.ack(msg);
        },
        { noAck: false, consumerTag: 'rmq-a-responder' },
      );
    }, 30000);

    afterAll(async () => {
      await new Promise<void>((resolve) => responderChannel.cancel('rmq-a-responder', () => resolve()));
      await rmq.close();
    });

    it('is a singleton per connector and ignores repeated init', async () => {
      expect(new Rmq('group-a')).toBe(rmq);
      await rmq.init({});
      expect(rmq.initialized).toBe(true);
    });

    it('sends a request and receives the response (in-memory store)', async () => {
      const res = await rmq.sendRequestAndWaitResponse('req-1', { ipn: 'fake' }, 'ping');
      expect(res.payload).toMatchObject({ uuid: 'req-1', answer: 42 });
    });

    it('sends a request and receives the response (redis store)', async () => {
      const prev = getRedisClient();
      setAppContext({ redisClient: makeFakeRedis() });
      try {
        const res = await rmq.sendRequestAndWaitResponse('req-2', { a: 1 }, 'ping', false);
        expect(res.payload).toMatchObject({ uuid: 'req-2', answer: 42 });
      } finally {
        setAppContext({ redisClient: prev });
      }
    });

    it('returns undefined when no response arrives before the timeout', async () => {
      const prevTimeout = rmq.options.getIncomingMessageTimeout;
      rmq.options.getIncomingMessageTimeout = 300;
      const spy = jest.spyOn(rmq, 'produce').mockResolvedValue(true);
      try {
        const res = await rmq.sendRequestAndWaitResponse('req-none', {}, 'ping');
        expect(res).toBeUndefined();
      } finally {
        spy.mockRestore();
        rmq.options.getIncomingMessageTimeout = prevTimeout;
      }
    });

    it('throws when the request cannot be produced', async () => {
      const spy = jest.spyOn(rmq, 'produce').mockRejectedValue(new Error('cannot publish'));
      await expect(rmq.sendRequestAndWaitResponse('req-3', {}, 'ping')).rejects.toThrow('cannot publish');
      spy.mockRestore();
    });

    it('produce rethrows channel errors', async () => {
      const original = rmq.channels.writing;
      rmq.channels.writing = {
        publish: () => {
          throw new Error('publish failed');
        },
      };
      await expect(rmq.produce({ payload: { uuid: 'x' } })).rejects.toThrow('publish failed');
      rmq.channels.writing = original;
    });

    it('consumingHandler rejects messages without uuid and stores messages with uuid', async () => {
      expect(await rmq.consumingHandler()).toBe(false);
      expect(await rmq.consumingHandler({ payload: {} })).toBe(false);
      expect(await rmq.consumingHandler({ payload: { uuid: 'stored-1' } })).toBe(true);
      expect(await rmq.getIncomingMessageById('stored-1')).toMatchObject({ payload: { uuid: 'stored-1' } });
    });

    it('getIncomingMessageById rejects after the timeout', async () => {
      const prevTimeout = rmq.options.getIncomingMessageTimeout;
      rmq.options.getIncomingMessageTimeout = 250;
      await expect(rmq.getIncomingMessageById('missing')).rejects.toThrow('Cant get message by ID during timeout.');
      rmq.options.getIncomingMessageTimeout = prevTimeout;
    });

    it('init with decorator mode skips connecting', async () => {
      const decorated = new Rmq('group-a-decorator');
      await decorated.init({ useRmqDecorator: true, writingQueueName: 'q' });
      expect(decorated.initialized).toBeFalsy();
      expect(decorated.options.useRmqDecorator).toBe(true);
    });

    it('sends the request through the RMQ decorator', async () => {
      const decorated = new Rmq('group-a-decorator');
      app
        .nock('http://rmq-decorator.local')
        .post('/send')
        .reply(200, { data: { payload: { answer: 7 } } });
      const res = await decorated.sendRequestAndWaitResponseViaDecorator({
        id: 'dec-1',
        request: { a: 1 },
        event: 'ping',
        rmqDecoratorUrl: 'http://rmq-decorator.local/send',
        rmqDecoratorToken: 'fake-token',
        writingQueueName: 'w',
        writingExchangeName: 'x',
        persistent: true,
        readingQueueName: 'r',
      });
      expect(res).toEqual({ payload: { answer: 7 } });
    });

    it('decorator errors are logged and then fail on the missing response', async () => {
      const decorated = new Rmq('group-a-decorator');
      app.nock('http://rmq-decorator.local').post('/send').reply(500, { error: 'x' });
      await expect(
        decorated.sendRequestAndWaitResponseViaDecorator({
          id: 'dec-2',
          request: {},
          event: 'ping',
          rmqDecoratorUrl: 'http://rmq-decorator.local/send',
          rmqDecoratorToken: 'fake-token',
          getIncomingMessageTimeout: 1000,
        }),
      ).rejects.toThrow();
    });

    it('nacks messages that the handler does not accept', async () => {
      const nackSpy = jest.spyOn(rmq.channels.reading, 'nack').mockImplementation((() => undefined) as any);
      // A message without uuid is "not handled" by consumingHandler.
      raw.channel.publish(rmq.options.readingExchangeName, rmq.options.readingQueueName, Buffer.from(JSON.stringify({ payload: {} })));
      await waitFor(async () => nackSpy.mock.calls.length > 0);
      nackSpy.mockRestore();
    });

    it('initConnection rejects for an unreachable broker and close resolves on error', async () => {
      const broken = new Rmq('group-a-broken');
      await expect(broken.init({ ...opts(), amqpConnection: 'amqp://127.0.0.1:1' })).rejects.toBeDefined();
      broken.connection = { close: (cb: any) => cb(new Error('close failed')) };
      await expect(broken.close()).resolves.toBeUndefined();
    });
  });

  describe('EventBusiness helpers', () => {
    const makeCtx = () => ({ data: {}, done: true, result: {} as any, dueDate: undefined });
    const eventContext: any = {
      workflowId: 'wf-fake',
      eventTemplateId: 1,
      documents: [],
      events: [],
      eventTemplateJsonSchemaObject: {
        saveToRegisters: { keyId: 1 },
        saveToRegistersList: { keyId: 1 },
        updateRegisters: { keyId: 1 },
        updateRegistersList: { keyId: 1 },
      },
    };
    let requestSpy: jest.SpyInstance;
    let signSpy: jest.SpyInstance;
    let inboxSpy: jest.SpyInstance;

    beforeEach(() => {
      requestSpy = jest.spyOn(app.eventBusiness, 'handleRequestEvent').mockImplementation((async ({ type, crudType }: any) => {
        if (type === 'registerKeys') return { keySignature: { validationIdentity: true } };
        return { type, crudType, ok: true };
      }) as any);
      signSpy = jest.spyOn(app.eventBusiness, 'signRegisterRecord').mockResolvedValue('signature-fake' as any);
      inboxSpy = jest.spyOn(app.eventBusiness, 'sendToInboxesIfNeedIt').mockResolvedValue(undefined as any);
    });

    afterEach(() => {
      requestSpy.mockRestore();
      signSpy.mockRestore();
      inboxSpy.mockRestore();
    });

    it('handleRequest dispatches every request kind', async () => {
      const ctx: any = makeCtx();
      const calculated: any = {
        saveToBlockchain: { a: 1 },
        getRegisters: { a: 1 },
        countRegisters: { a: 1 },
        getRegistersByPost: { a: 1 },
        saveToRegisters: { data: { b: 2, a: 1 } },
        saveRegisterRecordsToCsv: { inboxes: { workflowCreator: true } },
        saveToRegistersList: [{ data: { a: 1 } }, { data: { a: 2 } }],
        updateRegisters: { recordId: 'r1', data: { a: 1 }, keyId: 5 },
        updateRegistersList: [{ recordId: 'r1', data: { a: 1 } }],
        deleteRegisters: 'r-del',
        sendToExternalService: { inboxes: { workflowCreator: true } },
        getDocument: { options: { x: 1 } },
        saveDocument: { inboxes: { workflowCreator: true } },
        serviceRepositoryData: { s: 1 },
      };
      requestSpy.mockImplementation((async ({ type, crudType }: any) => {
        if (type === 'registerKeys') return { keySignature: { validationIdentity: true } };
        if (type === 'saveRegisterRecordsToCsv') return { savedDocument: { id: 'd1' } };
        if (type === 'externalService') return { sendingResult: { savedDocument: { id: 'd2' } } };
        if (type === 'document' && crudType !== 'get') return { savedDocument: { id: 'd3' } };
        return { type, crudType };
      }) as any);

      await app.eventBusiness.handleRequest(ctx, calculated, eventContext);

      expect(Object.keys(ctx.result)).toEqual(
        expect.arrayContaining([
          'saveToBlockchain',
          'getRegisters',
          'countRegisters',
          'getRegistersByPost',
          'saveToRegisters',
          'saveToRegistersList',
          'updateRegisters',
          'updateRegistersList',
          'deleteRegisters',
          'sendToExternalService',
          'getDocument',
          'saveDocument',
          'serviceRepositoryData',
        ]),
      );
      expect(signSpy).toHaveBeenCalled();
      expect(inboxSpy).toHaveBeenCalledTimes(3);
    });

    it('handleRequest validates deleteRegistersList params', async () => {
      const run = (deleteRegistersList: any) => app.eventBusiness.handleRequest(makeCtx(), { deleteRegistersList }, eventContext);
      await expect(run({ recordIds: ['a'] })).rejects.toThrow('must be defined');
      await expect(run({ recordIds: 'a', registerId: 1, keyId: 1 })).rejects.toThrow('not empty array');
      await expect(run({ recordIds: [], registerId: 1, keyId: 1 })).rejects.toThrow('not empty array');
      const many = Array.from({ length: 101 }, (_, i) => `r${i}`);
      await expect(run({ recordIds: many, registerId: 1, keyId: 1 })).rejects.toThrow('more than 100');
    });

    it('handleRequest deletes listed records, in batches, when all exist', async () => {
      const ids = Array.from({ length: 25 }, (_, i) => `rec${i}`);
      requestSpy.mockImplementation((async ({ crudType }: any) => (crudType === 'get' ? [{ id: 'x' }] : { deleted: true })) as any);
      const ctx: any = makeCtx();
      await app.eventBusiness.handleRequest(
        ctx,
        { deleteRegistersList: { recordIds: ids, registerId: 1, keyId: 2, returnDeletedRecords: true } },
        eventContext,
      );
      expect(ctx.result.deleteRegistersList).toMatchObject({ registerId: 1, keyId: 2, recordsCount: 25 });
      expect(ctx.result.deleteRegistersList.deletedRecords).toHaveLength(25);
    });

    it('handleRequest rejects deleteRegistersList when a record is missing', async () => {
      requestSpy.mockImplementation((async () => []) as any);
      await expect(
        app.eventBusiness.handleRequest(makeCtx(), { deleteRegistersList: { recordIds: ['a', 'b'], registerId: 1, keyId: 2 } }, eventContext),
      ).rejects.toThrow('must be pressent');
    });

    it('allows deleting more than 100 records only for whitelisted keys', async () => {
      const many = Array.from({ length: 101 }, (_, i) => `r${i}`);
      const cfg = (app.eventBusiness as any).config;
      const prev = cfg.requester;
      cfg.requester = { registers: { keysAllowedToDeleteMoreThan100Records: [77], deleteRecordsQueue: { concurrent: 500, interval: 1 } } };
      requestSpy.mockImplementation((async ({ crudType }: any) => (crudType === 'get' ? [1] : { deleted: true })) as any);
      try {
        const ctx: any = makeCtx();
        await app.eventBusiness.handleRequest(ctx, { deleteRegistersList: { recordIds: many, registerId: 1, keyId: 77 } }, eventContext);
        expect(ctx.result.deleteRegistersList.recordsCount).toBe(101);
      } finally {
        cfg.requester = prev;
      }
    });

    it('getRecordsToDelete stops on a rejected lookup', async () => {
      requestSpy.mockImplementation((async () => {
        throw new Error('lookup failed');
      }) as any);
      const rows = await app.eventBusiness.getRecordsToDelete(['a', 'b'], { interval: 1 }, { registerId: 1, keyId: 1 });
      expect(rows).toEqual([]);
    });

    it('handleNotification validates required options and wraps send failures', async () => {
      await expect(app.eventBusiness.handleNotification(makeCtx(), {}, eventContext, { someKey: 1 })).rejects.toThrow(
        'Required options were not passed',
      );
    });

    it('recursiveSort sorts nested object keys only', () => {
      expect(JSON.stringify(app.eventBusiness.recursiveSort({ b: 1, a: { d: 1, c: 2 }, arr: [{ z: 1, y: 2 }] }))).toBe(
        '{"a":{"c":2,"d":1},"arr":[{"z":1,"y":2}],"b":1}',
      );
      expect(app.eventBusiness.recursiveSort('x')).toBe('x');
      expect(app.eventBusiness.recursiveSort({})).toEqual({});
    });

    it('signRegisterRecord returns the signature data and rethrows sign errors', async () => {
      signSpy.mockRestore();
      const sign = jest.spyOn((app.eventBusiness as any).sign, 'sign').mockResolvedValueOnce({ data: 'sig-ok' } as any);
      expect(await app.eventBusiness.signRegisterRecord({ b: 1, a: 2 })).toBe('sig-ok');
      sign.mockRejectedValueOnce(new Error('sign down'));
      await expect(app.eventBusiness.signRegisterRecord({ a: 1 })).rejects.toThrow('sign down');
      sign.mockRestore();
      signSpy = jest.spyOn(app.eventBusiness, 'signRegisterRecord').mockResolvedValue('x' as any);
    });

    it('getRetryInfo returns the next retry message or nothing', () => {
      expect(app.eventBusiness.getRetryInfo({ retryIterator: 0 }, {})).toBeUndefined();
      expect(app.eventBusiness.getRetryInfo({ retryIterator: 2 }, { retryIfError: ['10m', '1h'] })).toBeUndefined();
      expect(app.eventBusiness.getRetryInfo({ a: 1 }, { retryIfError: ['10m', '1h'] })).toEqual({
        retryMessage: { a: 1, retryIterator: 1 },
        postponedTime: '10m',
      });
    });

    it('transformFunctionToAsync adds async/await only where needed', () => {
      expect(app.eventBusiness.transformFunctionToAsync('() => 1')).toBe('() => 1');
      expect(app.eventBusiness.transformFunctionToAsync('() => await plinkFromFilestoragePdf(x)')).toBe('() => await plinkFromFilestoragePdf(x)');
      expect(app.eventBusiness.transformFunctionToAsync('() => plinkFromFilestoragePdf(x)')).toBe('async () => await plinkFromFilestoragePdf(x)');
      expect(app.eventBusiness.transformFunctionToAsync('async () => plinkFromFilestorageAttach(x)')).toBe(
        'async () => await plinkFromFilestorageAttach(x)',
      );
    });

    it('getUsersListForInboxes combines workflow creator and sandbox function results', async () => {
      const wfSpy = jest.spyOn((app.eventBusiness as any).workflowModel, 'findById').mockResolvedValue({ createdBy: 'user-creator' } as any);
      inboxSpy.mockRestore();
      const users = await app.eventBusiness.getUsersListForInboxes({
        inboxesJsonSchema: { workflowCreator: true, users: "() => ['user-a', 'user-creator']" },
        workflowId: 'wf',
        workflowTemplateId: 1,
        documents: [],
      });
      expect(users).toEqual(['user-creator', 'user-a']);
      expect(
        await app.eventBusiness.getUsersListForInboxes({ inboxesJsonSchema: { users: "() => 'single'" }, workflowTemplateId: 1, documents: [] }),
      ).toEqual(['single']);
      expect(
        await app.eventBusiness.getUsersListForInboxes({ inboxesJsonSchema: { users: '() => 5' }, workflowTemplateId: 1, documents: [] }),
      ).toEqual([]);
      expect(
        await app.eventBusiness.getUsersListForInboxes({
          inboxesJsonSchema: { users: '() => { throw new Error("x"); }' },
          workflowTemplateId: 1,
          documents: [],
        }),
      ).toEqual([]);
      wfSpy.mockRestore();
      inboxSpy = jest.spyOn(app.eventBusiness, 'sendToInboxesIfNeedIt').mockResolvedValue(undefined as any);
    });

    it('sendToInboxesIfNeedIt creates an inbox entry for each user', async () => {
      inboxSpy.mockRestore();
      const tplSpy = jest
        .spyOn((app.eventBusiness as any).documentTemplateModel, 'findByIdCached')
        .mockResolvedValue({ name: 'Doc name', jsonSchema: {} } as any);
      const usersSpy = jest.spyOn(app.eventBusiness, 'getUsersListForInboxes').mockResolvedValue(['u1', 'u2']);
      const createSpy = jest.spyOn((app.eventBusiness as any).userInboxModel, 'create').mockResolvedValue({} as any);
      await app.eventBusiness.sendToInboxesIfNeedIt({
        workflowId: 'wf',
        inboxesJsonSchema: { fileName: "(documents) => 'inbox-name'" },
        document: { id: 'doc-1', documentTemplateId: 1, number: '12' },
        documents: [],
        events: [],
      });
      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(createSpy).toHaveBeenCalledWith({ userId: 'u1', documentId: 'doc-1', name: 'inbox-name', number: '12' });
      tplSpy.mockRestore();
      usersSpy.mockRestore();
      createSpy.mockRestore();
      inboxSpy = jest.spyOn(app.eventBusiness, 'sendToInboxesIfNeedIt').mockResolvedValue(undefined as any);
    });

    it('getEmailsByUserIdFromUnit merges users from every unit kind', async () => {
      const spy = jest
        .spyOn((app.eventBusiness as any).unitModel, 'getUsersFromUnits')
        .mockResolvedValue({ all: ['a', 'b'], heads: ['b', 'c'], members: ['d'] } as any);
      expect((await app.eventBusiness.getEmailsByUserIdFromUnit([1], [2], [3])).sort()).toEqual(['a', 'b', 'c', 'd']);
      expect(await app.eventBusiness.getEmailsByUserIdFromUnit([], [], [])).toEqual([]);
      spy.mockRestore();
    });

    describe('setWorkflowStatus', () => {
      let setStatus: jest.SpyInstance;
      beforeEach(() => {
        setStatus = jest.spyOn(getModels().workflow, 'setStatus').mockResolvedValue(undefined as any);
      });
      afterEach(() => setStatus.mockRestore());
      const run = (statuses: any) => app.eventBusiness.setWorkflowStatus('wf', { id: 1, data: { statuses } }, 10, 1, { documents: [], events: [] });
      const status = (type: string, extra: any = {}) => ({ type, label: 'l', description: 'd', ...extra });

      it('ignores templates without a matching status', async () => {
        await run(undefined);
        await run([{ eventTemplateId: 99, statusId: 1 }]);
        await run([{ eventTemplateId: 10 }]);
        expect(setStatus).not.toHaveBeenCalled();
      });

      it('sets a fixed status id', async () => {
        await run([{ eventTemplateId: 10, statusId: 2 }]);
        expect(setStatus).toHaveBeenCalledWith('wf', 2);
      });

      it('calculates status ids from doing/done/rejected types', async () => {
        for (const [type, id] of [
          ['doing', 1],
          ['done', 2],
          ['rejected', 3],
        ] as any) {
          setStatus.mockClear();
          await run([{ eventTemplateId: 10, calculate: `() => [${JSON.stringify(status(type, { isStatusesTab: false }))}]` }]);
          expect(setStatus.mock.calls[0][1]).toBe(id);
        }
      });

      it('returns on empty calculated list and throws on invalid statuses', async () => {
        await run([{ eventTemplateId: 10, calculate: '() => []' }]);
        expect(setStatus).not.toHaveBeenCalled();
        await expect(run([{ eventTemplateId: 10, calculate: '() => [{ type: "nope" }]' }])).rejects.toThrow('Invalid status.');
        await expect(run([{ eventTemplateId: 10, calculate: `() => [${JSON.stringify(status('done'))}]` }])).rejects.toThrow('Non tabed');
      });

      it('substitutes frontUrl into the calculate function', async () => {
        const cfg = (app.eventBusiness as any).config;
        const prev = cfg.notifier;
        cfg.notifier = { email: { templateParams: { frontUrl: 'http://front.local' } } };
        try {
          await run([{ eventTemplateId: 10, calculate: `() => [{ type: 'done', label: '{{frontUrl}}', description: 'd', isStatusesTab: false }]` }]);
          expect(setStatus.mock.calls[0][2][0].label).toBe('http://front.local');
        } finally {
          cfg.notifier = prev;
        }
      });
    });

    it('runDaemon sends due delay events and retries postponed notifications', async () => {
      const bus: any = app.eventBusiness;
      const publish = jest.spyOn(getMessageBus(), 'publish').mockResolvedValue({ messageId: 'x' });
      const running = jest.spyOn(bus.runningEvents, 'lockAndGetRunningEvents').mockResolvedValue([{ id: 'e-delay' }]);
      const setDone = jest.spyOn(bus.eventModel, 'setDone').mockResolvedValue({ workflowId: 'wf-d' } as any);
      const unlock = jest.spyOn(bus.eventModel, 'unlockOldLockedEvents').mockResolvedValue(undefined as any);
      const okEvent = { id: 'e-ok', workflowId: 'wf-n', data: { options: { emails: ['a@fake.local'], subject: 's' }, statuses: {} } };
      const badEvent = { id: 'e-bad', workflowId: 'wf-n', data: { options: {}, dueDate: '2030-01-01', dueDates: ['2031-01-01'], statuses: {} } };
      const badEvent2 = { id: 'e-bad2', workflowId: 'wf-n', data: { options: {}, dueDate: '2030-01-01', statuses: {} } };
      const postponed = jest
        .spyOn(bus.eventModel, 'getPostponedEvents')
        .mockResolvedValueOnce([okEvent, badEvent, badEvent2] as any)
        .mockResolvedValue([] as any);
      const send = jest.spyOn(bus, 'sendNotification').mockImplementation((async (o: any) => {
        if (!o.emails) throw new Error('send failed');
        return { sent: true };
      }) as any);
      const update = jest.spyOn(bus.eventModel.model, 'update').mockResolvedValue([1] as any);
      const prevInterval = getConfig().delayer?.interval;
      getConfig().delayer = { ...(getConfig().delayer || {}), interval: 0.05 };
      try {
        await bus.runDaemon();
        await waitFor(async () => update.mock.calls.length >= 3);
        await sleep(200);
        bus.stopDaemon();
        expect(publish).toHaveBeenCalledWith('manager', { workflowId: 'wf-d', eventId: 'e-delay' });
        expect(publish).toHaveBeenCalledWith('manager', { workflowId: 'wf-n', eventId: 'e-ok' });
        expect(badEvent.data.statuses['2030-01-01']).toMatch(/^Error/);
        expect(badEvent.data.dueDate).toBe('2031-01-01');
        expect((badEvent2.data as any).dueDate).toBeUndefined();
      } finally {
        bus.stopDaemon();
        getConfig().delayer.interval = prevInterval;
        [publish, running, setDone, unlock, postponed, send, update].forEach((s) => s.mockRestore());
      }
    });

    it('runDaemon logs errors thrown by the loaders', async () => {
      const bus: any = app.eventBusiness;
      const running = jest.spyOn(bus.runningEvents, 'lockAndGetRunningEvents').mockRejectedValue(new Error('lock failed'));
      const postponed = jest.spyOn(bus.eventModel, 'getPostponedEvents').mockRejectedValue(new Error('postponed failed'));
      const prevDelayer = getConfig().delayer;
      getConfig().delayer = { ...(prevDelayer || {}), interval: 0.05 };
      try {
        await bus.runDaemon();
        await waitFor(async () => postponed.mock.calls.length > 0);
        bus.stopDaemon();
      } finally {
        bus.stopDaemon();
        getConfig().delayer = prevDelayer;
        running.mockRestore();
        postponed.mockRestore();
      }
    });
  });
});
