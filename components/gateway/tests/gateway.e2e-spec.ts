import { randomUUID, randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';

import { getDb, getMessageBus, setAppContext } from '../src/lib/context';
import { createGatewayMessageBus, recordHandlerFailure } from '../src/lib/message_bus';
import { registerShutdown } from '../src/lib/shutdown';
import { TestApp } from './test-app';

// Gateway template 988194001, seeded by this suite: a parallel-type gateway with no branching logic.
const PARALLEL_GATEWAY_TEMPLATE_ID = 988194001;
// Gateway template 988194002, seeded by this suite: an inclusive-type gateway with no branching logic.
const INCLUSIVE_GATEWAY_TEMPLATE_ID = 988194002;

// Gateway template 988191001, seeded by manager's data/test.e2e.sql: an exclusive gateway whose
// two formulas branch on `documents[988191001].data.companyInfo.createUnit` being 'Ні' or 'Так'.
const EXCLUSIVE_GATEWAY_TEMPLATE_ID = 988191001;
const EXCLUSIVE_DOCUMENT_TEMPLATE_ID = 988191001;
const EXCLUSIVE_TASK_TEMPLATE_ID = 988191001;

// Poll a query until it returns a row, or give up after timeoutMs. Used only where the code under
// test has no log/queue-message hook to await instead (see the debug-mode test below).
async function waitForRow(query: () => Promise<any[]>, timeoutMs = 5000, intervalMs = 100): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const [row] = await query();
    if (row) return row;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Timed out waiting for row.');
}

describe('Gateway Business (via RabbitMQ)', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();

    // Seed a parallel gateway template (branch-free: always forwards every incoming sequence).
    await getDb().query(
      `INSERT INTO gateway_templates (id, gateway_type_id, "name", description, json_schema, created_at, updated_at)
       VALUES (:id, 2, 'Parallel test gateway', '', '{}', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      { replacements: { id: PARALLEL_GATEWAY_TEMPLATE_ID } },
    );

    // Seed an inclusive gateway template (branch-free: always forwards every incoming sequence).
    await getDb().query(
      `INSERT INTO gateway_templates (id, gateway_type_id, "name", description, json_schema, created_at, updated_at)
       VALUES (:id, 3, 'Inclusive test gateway', '', '{}', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      { replacements: { id: INCLUSIVE_GATEWAY_TEMPLATE_ID } },
    );

    // Seed workflow templates (same ids as the gateway templates) whose BPMN contains the gateway, as the
    // handler requires the gateway template to belong to the workflow's template.
    for (const id of [PARALLEL_GATEWAY_TEMPLATE_ID, INCLUSIVE_GATEWAY_TEMPLATE_ID]) {
      await getDb().query(
        `INSERT INTO workflow_templates (id, "name", description, xml_bpmn_schema, "data", is_active, created_at, updated_at)
         VALUES (:id, 'Gateway test workflow', '', :xml, '{}'::json, true, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        {
          replacements: {
            id,
            xml: `<bpmn2:definitions><bpmn2:process><bpmn2:parallelGateway id="gateway-${id}" /></bpmn2:process></bpmn2:definitions>`,
          },
        },
      );
    }
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

  it('processes a parallel gateway and forwards every incoming sequence unchanged', async () => {
    const workflowId = randomUUID();
    const sequenceIds = ['Flow_parallel_a', 'Flow_parallel_b'];

    await getDb().query(
      `INSERT INTO workflows (id, workflow_template_id, is_final, data, created_by, updated_by, created_at, updated_at)
       VALUES (:workflowId, :workflowTemplateId, false, '{}'::jsonb, 'system', 'system', NOW(), NOW())`,
      { replacements: { workflowId, workflowTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID } },
    );

    await app.publishToReadingQueue({
      workflowId,
      gatewayTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID,
      workflowTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID,
      sequenceIds,
    });

    const outMessage = await app.consumeFromQueue(app.config.message_queue.writingQueueName);
    expect(outMessage).toMatchObject({ workflowId });
    expect(typeof outMessage.gatewayId).toBe('string');
    expect(typeof outMessage.amqpMessageId).toBe('string');

    const [gatewayRow] = await getDb().query('SELECT gateway_type_id, gateway_template_id, "data" FROM gateways WHERE id = :id', {
      replacements: { id: outMessage.gatewayId },
      type: 'SELECT',
    });
    expect(gatewayRow).toMatchObject({ gateway_type_id: 2, gateway_template_id: PARALLEL_GATEWAY_TEMPLATE_ID });
    expect(gatewayRow.data).toEqual({ resultSequences: sequenceIds });
  });

  it('processes an inclusive gateway and forwards every incoming sequence unchanged', async () => {
    const workflowId = randomUUID();
    const sequenceIds = ['Flow_inclusive_a'];

    await getDb().query(
      `INSERT INTO workflows (id, workflow_template_id, is_final, data, created_by, updated_by, created_at, updated_at)
       VALUES (:workflowId, :workflowTemplateId, false, '{}'::jsonb, 'system', 'system', NOW(), NOW())`,
      { replacements: { workflowId, workflowTemplateId: INCLUSIVE_GATEWAY_TEMPLATE_ID } },
    );

    await app.publishToReadingQueue({
      workflowId,
      gatewayTemplateId: INCLUSIVE_GATEWAY_TEMPLATE_ID,
      workflowTemplateId: INCLUSIVE_GATEWAY_TEMPLATE_ID,
      sequenceIds,
    });

    const outMessage = await app.consumeFromQueue(app.config.message_queue.writingQueueName);
    expect(outMessage).toMatchObject({ workflowId });

    const [gatewayRow] = await getDb().query('SELECT gateway_type_id, "data" FROM gateways WHERE id = :id', {
      replacements: { id: outMessage.gatewayId },
      type: 'SELECT',
    });
    expect(gatewayRow).toMatchObject({ gateway_type_id: 3 });
    expect(gatewayRow.data).toEqual({ resultSequences: sequenceIds });
  });

  it('processes an exclusive gateway and forwards only the matching branch', async () => {
    const workflowId = randomUUID();
    const documentId = randomUUID();
    const taskId = randomUUID();
    const sequenceIds = ['Flow_15yf3yt', 'Flow_1iyqzew']; // ['Ні', 'Так'], matching formula order.

    await getDb().query(
      `INSERT INTO workflows (id, workflow_template_id, is_final, data, created_by, updated_by, created_at, updated_at)
       VALUES (:workflowId, 988191, false, '{}'::jsonb, 'system', 'system', NOW(), NOW())`,
      { replacements: { workflowId } },
    );

    await getDb().query(
      `INSERT INTO documents (id, document_template_id, document_state_id, owner_id, created_by, updated_by, "data", created_at, updated_at)
       VALUES (:documentId, :documentTemplateId, 1, 'system', 'system', 'system', :data::json, NOW(), NOW())`,
      {
        replacements: {
          documentId,
          documentTemplateId: EXCLUSIVE_DOCUMENT_TEMPLATE_ID,
          data: JSON.stringify({ companyInfo: { createUnit: 'Так' } }),
        },
      },
    );

    await getDb().query(
      `INSERT INTO tasks (id, workflow_id, task_template_id, document_id, signer_users, performer_users, performer_units, tags, "data", finished, deleted, created_by, updated_by, created_at, updated_at)
       VALUES (:taskId, :workflowId, :taskTemplateId, :documentId, '{}', '{}', '{}', '{}', '{}'::json, true, false, 'system', 'system', NOW(), NOW())`,
      { replacements: { taskId, workflowId, taskTemplateId: EXCLUSIVE_TASK_TEMPLATE_ID, documentId } },
    );

    await app.publishToReadingQueue({
      workflowId,
      gatewayTemplateId: EXCLUSIVE_GATEWAY_TEMPLATE_ID,
      workflowTemplateId: 988191,
      sequenceIds,
    });

    const outMessage = await app.consumeFromQueue(app.config.message_queue.writingQueueName);
    expect(outMessage).toMatchObject({ workflowId });

    const [gatewayRow] = await getDb().query('SELECT gateway_type_id, "data" FROM gateways WHERE id = :id', {
      replacements: { id: outMessage.gatewayId },
      type: 'SELECT',
    });
    expect(gatewayRow).toMatchObject({ gateway_type_id: 1 });
    expect(gatewayRow.data).toMatchObject({
      resultSequence: 'Flow_1iyqzew',
      handledAsDefault: false,
    });
  });

  it('stores the result on the workflow_debug record instead of forwarding a message, when debugId is set', async () => {
    const workflowId = randomUUID();
    const debugId = randomBytes(16).toString('hex');
    const sequenceIds = ['Flow_debug_a'];

    await getDb().query(
      `INSERT INTO workflows (id, workflow_template_id, is_final, data, created_by, updated_by, created_at, updated_at)
       VALUES (:workflowId, :workflowTemplateId, false, '{}'::jsonb, 'system', 'system', NOW(), NOW())`,
      { replacements: { workflowId, workflowTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID } },
    );

    await app.publishToReadingQueue({
      workflowId,
      gatewayTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID,
      workflowTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID,
      sequenceIds,
      debugId,
    });

    // The debug branch doesn't log or produce a queue message, so poll for the row it writes.
    const debugRow = await waitForRow(() =>
      getDb().query('SELECT workflow_id, service_name, "data" FROM workflow_debug WHERE id = :id', {
        replacements: { id: debugId },
        type: 'SELECT',
      }),
    );
    expect(debugRow).toMatchObject({ workflow_id: workflowId, service_name: 'gateway' });
    expect(debugRow.data.result).toEqual({ resultSequences: sequenceIds });
  });

  it('acks and does not create a gateway when the gateway template is not part of the workflow template', async () => {
    const workflowId = randomUUID();

    await getDb().query(
      `INSERT INTO workflows (id, workflow_template_id, is_final, data, created_by, updated_by, created_at, updated_at)
       VALUES (:workflowId, :workflowTemplateId, false, '{}'::jsonb, 'system', 'system', NOW(), NOW())`,
      { replacements: { workflowId, workflowTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID } },
    );

    // Valid gateway template, but it belongs to another workflow template.
    await app.publishToReadingQueue({
      workflowId,
      gatewayTemplateId: INCLUSIVE_GATEWAY_TEMPLATE_ID,
      workflowTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID,
      sequenceIds: ['Flow_forged'],
    });

    const [, logData] = await app.log.waitForLog('gateway-handling|template-workflow-mismatch');
    expect(logData).toMatchObject({ workflowId, gatewayTemplateId: INCLUSIVE_GATEWAY_TEMPLATE_ID });

    const rows = await getDb().query('SELECT id FROM gateways WHERE workflow_id = :workflowId', { replacements: { workflowId }, type: 'SELECT' });
    expect(rows).toHaveLength(0);
  });

  // Wait for a log entry of the given type that matches the predicate.
  async function waitForLogWhere(type: string, predicate: (data: any) => boolean, timeoutMs = 5000): Promise<any> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const entry = app.log.getLogs().find(([entryType, data]) => entryType === type && predicate(data));
      if (entry) return entry[1];
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Timed out waiting for a "${type}" log entry.`);
  }

  async function insertWorkflow(workflowTemplateId: number): Promise<string> {
    const workflowId = randomUUID();
    await getDb().query(
      `INSERT INTO workflows (id, workflow_template_id, is_final, data, created_by, updated_by, created_at, updated_at)
       VALUES (:workflowId, :workflowTemplateId, false, '{}'::jsonb, 'system', 'system', NOW(), NOW())`,
      { replacements: { workflowId, workflowTemplateId } },
    );
    return workflowId;
  }

  async function errorRows(workflowId: string) {
    return getDb().query(
      `SELECT id, workflow_id, service_name, "data" FROM workflow_errors WHERE "data"->'queueMessage'->>'workflowId' = :workflowId`,
      {
        replacements: { workflowId },
        type: 'SELECT',
      },
    );
  }

  async function hasUnresolvedErrors(workflowId: string) {
    const [row] = await getDb().query('SELECT has_unresolved_errors FROM workflows WHERE id = :workflowId', {
      replacements: { workflowId },
      type: 'SELECT',
    });
    return row.has_unresolved_errors;
  }

  it('logs and swallows a gateway-template-not-found error instead of crashing the consumer', async () => {
    const workflowId = randomUUID();

    await app.publishToReadingQueue({
      workflowId,
      gatewayTemplateId: 999999999,
      sequenceIds: [],
    });

    const logData = await waitForLogWhere('document-creating-by-message-from-queue-error', (data) => data.workflowId === workflowId);
    expect(logData).toMatchObject({ workflowId, gatewayTemplateId: 999999999, error: { name: 'TypeError' }, workflowLinked: false });
    expect(typeof logData.errorId).toBe('number');
    expect(logData.messageObject).toBeUndefined();
    expect(JSON.stringify(logData)).not.toContain('Cannot read');
  });

  it('discards a message whose handler fails, records it unlinked and logs no payload (once, no redelivery)', async () => {
    const workflowId = await insertWorkflow(PARALLEL_GATEWAY_TEMPLATE_ID);
    // Force a throw out of the handler itself (from the catch block).
    const spy = jest.spyOn(app.gatewayBusiness, 'verifyMessageWorkflowId').mockRejectedValueOnce(new Error('forced failure'));

    await app.publishToReadingQueue({
      workflowId,
      gatewayTemplateId: 999999998,
      workflowTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID,
      sequenceIds: ['SENTINEL-U'],
    });

    const logData = await waitForLogWhere('message-bus-handler-error', (data) => data.workflowId === workflowId);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(logData).toMatchObject({ workflowId, gatewayTemplateId: 999999998, failure: 'threw', error: { name: 'Error' } });
    expect(JSON.stringify(logData)).not.toContain('forced failure');

    const connection = await app.getTestConnection();
    const channel = await connection.createChannel();
    const { messageCount } = await channel.checkQueue(app.config.message_queue.readingQueueName);
    await channel.close();
    expect(messageCount).toBe(0);
    expect(getMessageBus().health().counters.handlerErrors).toBe(1);
    expect(getMessageBus().health().lastHandlerErrorAt).toBeDefined();

    const rows = await errorRows(workflowId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ workflow_id: null, service_name: 'gateway' });
    expect(rows[0].data.error).toBe('forced failure');
    expect(rows[0].data.queueMessage.workflowId).toBe(workflowId);
    expect(logData.errorId).toBe(rows[0].id);
    expect(await hasUnresolvedErrors(workflowId)).toBeFalsy();

    // Bus logs never carry message bodies.
    const busLogs = app.log.getLogs().filter(([type]) => String(type).startsWith('message-bus'));
    expect(JSON.stringify(busLogs)).not.toContain('SENTINEL');
  });

  it('does not link, mark or notify a foreign workflow when failing before the template check', async () => {
    const foreignWorkflowId = await insertWorkflow(INCLUSIVE_GATEWAY_TEMPLATE_ID);

    // Valid gateway template that is not part of the foreign workflow; fails on the unknown type id before the check passes.
    await app.publishToReadingQueue({
      workflowId: foreignWorkflowId,
      gatewayTemplateId: 999999997,
      workflowTemplateId: INCLUSIVE_GATEWAY_TEMPLATE_ID,
    });

    const logData = await waitForLogWhere('document-creating-by-message-from-queue-error', (data) => data.workflowId === foreignWorkflowId);
    expect(logData.workflowLinked).toBe(false);
    const rows = await errorRows(foreignWorkflowId);
    expect(rows).toHaveLength(1);
    expect(rows[0].workflow_id).toBeNull();
    expect(await hasUnresolvedErrors(foreignWorkflowId)).toBeFalsy();
    expect(app.log.getLogs().some(([type, data]) => type === 'system-notifier-error' && data)).toBe(false);
  });

  it('links and marks the workflow on a normal failure (invalid gateway type)', async () => {
    const workflowId = await insertWorkflow(PARALLEL_GATEWAY_TEMPLATE_ID);
    const spy = jest.spyOn(app.gatewayBusiness.gatewayTypeModel, 'findById').mockResolvedValueOnce({ name: 'unknown' });
    const notifier = jest.spyOn(app.gatewayBusiness.systemNotifier, 'sendEmails').mockResolvedValue(undefined);

    await app.publishToReadingQueue({
      workflowId,
      gatewayTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID,
      workflowTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID,
      sequenceIds: ['Flow_a'],
    });

    const logData = await waitForLogWhere('document-creating-by-message-from-queue-error', (data) => data.workflowId === workflowId);
    expect(logData.workflowLinked).toBeUndefined();
    const rows = await errorRows(workflowId);
    expect(rows).toHaveLength(1);
    expect(rows[0].workflow_id).toBe(workflowId);
    expect(await hasUnresolvedErrors(workflowId)).toBe(true);
    expect(notifier).toHaveBeenCalledWith(expect.objectContaining({ workflowId }));
    spy.mockRestore();
    notifier.mockRestore();
  });

  it('consumes from queues declared raw before the bus starts', async () => {
    const config = {
      ...app.config,
      message_queue: { ...app.config.message_queue, readingQueueName: `compat-in-${randomUUID()}`, writingQueueName: `compat-out-${randomUUID()}` },
    };
    const connection = await app.getTestConnection();
    const channel = await connection.createChannel();
    const channelError = jest.fn();
    channel.on('error', channelError);
    await channel.assertQueue(config.message_queue.readingQueueName, { durable: true });
    await channel.assertQueue(config.message_queue.writingQueueName, { durable: true });

    const bus = createGatewayMessageBus(config);
    const handler = jest.fn().mockResolvedValue(true);
    await bus.subscribe('gateway', handler, { concurrency: 1, onFailure: recordHandlerFailure });
    await bus.init();
    try {
      channel.sendToQueue(config.message_queue.readingQueueName, Buffer.from(JSON.stringify({ workflowId: 'w' })), { persistent: true });
      const start = Date.now();
      while (!handler.mock.calls.length && Date.now() - start < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(handler).toHaveBeenCalledTimes(1);
      expect(channelError).not.toHaveBeenCalled();
    } finally {
      await bus.close();
      await channel.close().catch(() => undefined);
    }
  });

  it('handles a redelivered raw body once when dedup is enabled with a store', async () => {
    const store = new Map<string, string>();
    const fake = { get: async (key: string) => store.get(key) ?? null, set: async (key: string, value: string) => void store.set(key, value) };
    setAppContext({ redisClient: fake });
    app.config.redis = { ...app.config.redis, amqpMessageCache: { isEnabled: true, ttl: 60 } };
    const spy = jest.spyOn(app.gatewayBusiness.gatewayTemplateModel, 'findById');
    const workflowId = randomUUID();
    const message = { workflowId, gatewayTemplateId: 999999996, sequenceIds: [], amqpMessageId: `dedup-${randomUUID()}` };

    try {
      await app.publishToReadingQueue(message);
      await waitForLogWhere('document-creating-by-message-from-queue-error', (data) => data.workflowId === workflowId);
      await app.publishToReadingQueue(message);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      app.config.redis.amqpMessageCache.isEnabled = false;
      spy.mockRestore();
    }
  });

  it('drains in-flight work on SIGTERM, then exits', async () => {
    const workflowId = await insertWorkflow(PARALLEL_GATEWAY_TEMPLATE_ID);
    const model = app.gatewayBusiness.gatewayTemplateModel;
    const original = model.findById.bind(model);
    let started: () => void;
    const startedPromise = new Promise<void>((resolve) => (started = resolve));
    jest.spyOn(model, 'findById').mockImplementation(async (...args: any[]) => {
      started();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return original(...args);
    });

    const emitter = new EventEmitter();
    const exit = jest.fn();
    registerShutdown({ routerService: app.routerService, messageBus: getMessageBus() }, { processLike: emitter, exit });

    await app.publishToReadingQueue({
      workflowId,
      gatewayTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID,
      workflowTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID,
      sequenceIds: ['Flow_drain'],
    });
    await startedPromise;
    emitter.emit('SIGTERM');
    expect(exit).not.toHaveBeenCalled();

    const start = Date.now();
    while (!exit.mock.calls.length && Date.now() - start < 10000) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(exit).toHaveBeenCalledTimes(1);

    const outMessage = await app.consumeFromQueue(app.config.message_queue.writingQueueName);
    expect(outMessage).toMatchObject({ workflowId });
    expect(await app.countQueueMessages(app.config.message_queue.readingQueueName)).toBe(0);
    expect(app.log.getLogs().some(([type]) => type === 'message-bus-settle-error')).toBe(false);
  });
});
