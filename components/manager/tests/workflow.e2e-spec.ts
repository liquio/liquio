import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

import { TestApp, SPECIAL_WORKFLOW_TEMPLATE_ID } from './test-app';
import { getDb } from '../src/lib/context';
import { createManagerMessageBus } from '../src/lib/message_bus';
import { registerShutdown } from '../src/lib/shutdown';

// Workflow template 988191, seeded by data/test.e2e.sql, flows:
// task-988191001 --Flow_1twkt51--> gateway-988191001 (exclusive gateway)
//   --Flow_1iyqzew--> event-988191002 --Flow_1csanhq--> event-988191004
const WORKFLOW_TEMPLATE_ID = 988191;
const TASK_TEMPLATE_ID = 988191001;
const GATEWAY_TEMPLATE_ID = 988191001;
const EVENT_TEMPLATE_ID = 988191002;
const NEXT_EVENT_TEMPLATE_ID = 988191004;

describe('Workflow Business (via RabbitMQ)', () => {
  let app: TestApp;
  let workflowId: string;
  let taskId: string;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();

    // Seed a fresh, in-progress workflow and its current task.
    workflowId = randomUUID();
    taskId = randomUUID();

    await getDb().query(
      `INSERT INTO workflows (id, workflow_template_id, is_final, data, created_by, updated_by, created_at, updated_at)
       VALUES (:workflowId, :workflowTemplateId, false, '{"messages": []}'::jsonb, 'system', 'system', NOW(), NOW())`,
      { replacements: { workflowId, workflowTemplateId: WORKFLOW_TEMPLATE_ID } },
    );

    await getDb().query(
      `INSERT INTO tasks (id, workflow_id, task_template_id, performer_users, signer_users, performer_units, tags, data, finished, deleted, created_by, updated_by, created_at, updated_at)
       VALUES (:taskId, :workflowId, :taskTemplateId, '{}', '{}', '{}', '{}', '{}'::json, true, false, 'system', 'system', NOW(), NOW())`,
      { replacements: { taskId, workflowId, taskTemplateId: TASK_TEMPLATE_ID } },
    );
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  it('forwards only whitelisted fields of a forwardToTask message to the task queue', async () => {
    const message = { forwardToTask: true, taskTemplateId: TASK_TEMPLATE_ID, userId: 'system' };
    await app.publishToReadingQueue({ ...message, foo: 'bar' });

    const taskMessage = await app.consumeFromQueue(app.config.message_queue.writingQueueTask);

    expect(taskMessage).toEqual({ ...message, amqpMessageId: expect.any(String) });
  });

  it('processes a task-completion message from the reading queue and forwards it to the gateway queue', async () => {
    await app.publishToReadingQueue({ taskId });

    const gatewayMessage = await app.consumeFromQueue(app.config.message_queue.writingQueueGateway);

    expect(gatewayMessage).toMatchObject({
      workflowId,
      workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      gatewayTemplateId: GATEWAY_TEMPLATE_ID,
      userId: 'system',
    });
    expect(gatewayMessage.sequenceIds).toEqual(expect.arrayContaining(['Flow_15yf3yt', 'Flow_1iyqzew']));
  });

  it('processes a gateway-completion message and forwards the next step to the event queue', async () => {
    const gatewayId = randomUUID();

    await getDb().query(
      `INSERT INTO gateways (id, gateway_template_id, gateway_type_id, workflow_id, data, created_by, updated_by, created_at, updated_at)
       VALUES (:gatewayId, :gatewayTemplateId, 1, :workflowId, :data::json, 'system', 'system', NOW(), NOW())`,
      {
        replacements: {
          gatewayId,
          gatewayTemplateId: GATEWAY_TEMPLATE_ID,
          workflowId,
          data: JSON.stringify({ resultSequence: 'Flow_1iyqzew' }),
        },
      },
    );

    await app.publishToReadingQueue({ gatewayId });

    const eventMessage = await app.consumeFromQueue(app.config.message_queue.writingQueueEvent);

    expect(eventMessage).toMatchObject({
      workflowId,
      workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      eventTemplateId: EVENT_TEMPLATE_ID,
      userId: 'system',
    });
  });

  it('processes an event-completion message and forwards the next step to the event queue', async () => {
    const eventId = randomUUID();

    await getDb().query(
      `INSERT INTO events (id, event_template_id, event_type_id, workflow_id, done, data, created_by, updated_by, created_at, updated_at)
       VALUES (:eventId, :eventTemplateId, 1, :workflowId, true, '{}', 'system', 'system', NOW(), NOW())`,
      { replacements: { eventId, eventTemplateId: EVENT_TEMPLATE_ID, workflowId } },
    );

    await app.publishToReadingQueue({ eventId });

    const eventMessage = await app.consumeFromQueue(app.config.message_queue.writingQueueEvent);

    expect(eventMessage).toMatchObject({
      workflowId,
      workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      eventTemplateId: NEXT_EVENT_TEMPLATE_ID,
      userId: 'system',
    });
  });

  it('logs and swallows an unrecognized message shape instead of crashing the consumer', async () => {
    await app.publishToReadingQueue({ unknownField: true });

    const [, logData] = await app.log.waitForLog('workflow-processing-by-message-from-queue-error');

    expect(logData.error).toEqual({ name: 'Error' });
    expect(typeof logData.errorId).toBe('number');
  });

  async function waitForLogWhere(type: string, predicate: (data: any) => boolean, timeoutMs = 5000): Promise<any> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const entry = app.log.getLogs().find(([entryType, data]) => entryType === type && predicate(data));
      if (entry) return entry[1];
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Timed out waiting for a "${type}" log entry.`);
  }

  async function errorRows(queuedWorkflowId: string) {
    return getDb().query(
      `SELECT id, workflow_id, service_name, "data" FROM workflow_errors WHERE "data"->'queueMessage'->>'workflowId' = :queuedWorkflowId`,
      { replacements: { queuedWorkflowId }, type: 'SELECT' },
    ) as Promise<any[]>;
  }

  async function workflowRow(id: string) {
    const [row] = (await getDb().query('SELECT is_final, has_unresolved_errors, data FROM workflows WHERE id = :id', {
      replacements: { id },
      type: 'SELECT',
    })) as any[];
    return row;
  }

  async function queueMessageCount(queueName: string) {
    const connection = await app.getTestConnection();
    const channel = await connection.createChannel();
    const { messageCount } = await channel.checkQueue(queueName);
    await channel.close();
    return messageCount;
  }

  // Make the handler itself throw: the business catch cannot record the error and its last-resort log throws.
  function forceHandlerThrow() {
    jest.spyOn(app.workflowBusiness.workflowErrorModel, 'create').mockRejectedValueOnce(new Error('row insert failed'));
    const originalSave = app.log.save.bind(app.log);
    jest.spyOn(app.log, 'save').mockImplementation(((type: string, ...rest: any[]) => {
      if (type === 'workflow-id-not-found-error') throw new Error('forced failure');
      return originalSave(type, ...rest);
    }) as any);
  }

  describe('handler failures', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('discards a message whose handler throws, handles it once and records an unlinked row', async () => {
      const foreignWorkflowId = randomUUID();
      await getDb().query(
        `INSERT INTO workflows (id, workflow_template_id, is_final, data, created_by, updated_by, created_at, updated_at)
         VALUES (:foreignWorkflowId, :workflowTemplateId, false, '{"messages": []}'::jsonb, 'system', 'system', NOW(), NOW())`,
        { replacements: { foreignWorkflowId, workflowTemplateId: WORKFLOW_TEMPLATE_ID } },
      );
      const before = await workflowRow(foreignWorkflowId);
      const handlerErrorsBefore = app.messageBus.health().counters.handlerErrors;
      forceHandlerThrow();

      await app.publishToReadingQueue({ taskId: randomUUID(), workflowId: foreignWorkflowId, initData: 'SENTINEL' });

      const logData = await waitForLogWhere('message-bus-handler-error', (data) => data.workflowId === foreignWorkflowId);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      expect(logData).toMatchObject({ failure: 'threw', error: { name: 'Error' } });
      expect(JSON.stringify(logData)).not.toContain('forced failure');
      expect(app.messageBus.health().counters.handlerErrors).toBe(handlerErrorsBefore + 1);
      expect(await queueMessageCount(app.config.message_queue.readingQueueName)).toBe(0);

      const rows = await errorRows(foreignWorkflowId);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ workflow_id: null, service_name: 'manager' });
      expect(rows[0].data.error).toBe('forced failure');
      expect(rows[0].data.queueMessage.workflowId).toBe(foreignWorkflowId);
      expect(logData.errorId).toBe(rows[0].id);
      expect(await workflowRow(foreignWorkflowId)).toEqual(before);

      const busLogs = app.log.getLogs().filter(([type]) => String(type).startsWith('message-bus'));
      expect(JSON.stringify(busLogs)).not.toContain('SENTINEL');
    });

    it('links the row to the workflow of the seeded task, not to the one in the message', async () => {
      const foreignWorkflowId = randomUUID();
      jest.spyOn(app.workflowBusiness.workflowModel, 'findById').mockRejectedValueOnce(new Error('lookup failed'));
      forceHandlerThrow();

      await app.publishToReadingQueue({ taskId, workflowId: foreignWorkflowId });

      await waitForLogWhere('message-bus-handler-error', (data) => data.workflowId === foreignWorkflowId);
      const rows = await errorRows(foreignWorkflowId);
      expect(rows).toHaveLength(1);
      expect(rows[0].workflow_id).toBe(workflowId);
    });

    it('links the row to the workflow of the seeded gateway and event', async () => {
      const gatewayId = randomUUID();
      const eventId = randomUUID();
      await getDb().query(
        `INSERT INTO gateways (id, gateway_template_id, gateway_type_id, workflow_id, data, created_by, updated_by, created_at, updated_at)
         VALUES (:gatewayId, :gatewayTemplateId, 1, :workflowId, :data::json, 'system', 'system', NOW(), NOW())`,
        { replacements: { gatewayId, gatewayTemplateId: GATEWAY_TEMPLATE_ID, workflowId, data: JSON.stringify({ resultSequence: 'Flow_1iyqzew' }) } },
      );
      await getDb().query(
        `INSERT INTO events (id, event_template_id, event_type_id, workflow_id, done, data, created_by, updated_by, created_at, updated_at)
         VALUES (:eventId, :eventTemplateId, 1, :workflowId, true, '{}', 'system', 'system', NOW(), NOW())`,
        { replacements: { eventId, eventTemplateId: EVENT_TEMPLATE_ID, workflowId } },
      );

      for (const key of [{ gatewayId }, { eventId }]) {
        const foreignWorkflowId = randomUUID();
        jest.spyOn(app.workflowBusiness.workflowModel, 'findById').mockRejectedValueOnce(new Error('lookup failed'));
        forceHandlerThrow();

        await app.publishToReadingQueue({ ...key, workflowId: foreignWorkflowId });

        await waitForLogWhere('message-bus-handler-error', (data) => data.workflowId === foreignWorkflowId);
        const rows = await errorRows(foreignWorkflowId);
        expect(rows).toHaveLength(1);
        expect(rows[0].workflow_id).toBe(workflowId);
        jest.restoreAllMocks();
      }
    });

    it('records an unlinked row and still logs the error id when the entity lookup throws', async () => {
      const foreignWorkflowId = randomUUID();
      jest.spyOn(app.workflowBusiness.taskModel, 'findById').mockRejectedValue(new Error('db down'));
      forceHandlerThrow();

      await app.publishToReadingQueue({ taskId, workflowId: foreignWorkflowId });

      const logData = await waitForLogWhere('message-bus-handler-error', (data) => data.workflowId === foreignWorkflowId);
      const rows = await errorRows(foreignWorkflowId);
      expect(rows).toHaveLength(1);
      expect(rows[0].workflow_id).toBeNull();
      expect(logData.errorId).toBe(rows[0].id);
    });
  });

  it('discards a malformed next task id once instead of looping', async () => {
    const malformedWorkflowId = randomUUID();
    const malformedTaskId = randomUUID();
    const workflowTemplateId = 988193;
    await getDb().query(
      `INSERT INTO workflow_templates (id, workflow_template_category_id, name, description, xml_bpmn_schema, data, created_at, updated_at, is_active, access_units, errors_subscribers)
       SELECT :workflowTemplateId, workflow_template_category_id, name, description, xml_bpmn_schema, data, created_at, updated_at, is_active, access_units, errors_subscribers
       FROM workflow_templates WHERE id = :sourceId`,
      { replacements: { workflowTemplateId, sourceId: WORKFLOW_TEMPLATE_ID } },
    );
    await getDb().query(
      `UPDATE workflow_templates SET xml_bpmn_schema = replace(xml_bpmn_schema, 'targetRef="gateway-988191001"', 'targetRef="task-0"') WHERE id = :workflowTemplateId`,
      {
        replacements: { workflowTemplateId },
      },
    );
    await getDb().query(
      `INSERT INTO workflows (id, workflow_template_id, is_final, data, created_by, updated_by, created_at, updated_at)
       VALUES (:malformedWorkflowId, :workflowTemplateId, false, '{"messages": []}'::jsonb, 'system', 'system', NOW(), NOW())`,
      { replacements: { malformedWorkflowId, workflowTemplateId } },
    );
    await getDb().query(
      `INSERT INTO tasks (id, workflow_id, task_template_id, performer_users, signer_users, performer_units, tags, data, finished, deleted, created_by, updated_by, created_at, updated_at)
       VALUES (:malformedTaskId, :malformedWorkflowId, :taskTemplateId, '{}', '{}', '{}', '{}', '{}'::json, true, false, 'system', 'system', NOW(), NOW())`,
      { replacements: { malformedTaskId, malformedWorkflowId, taskTemplateId: TASK_TEMPLATE_ID } },
    );

    await app.publishToReadingQueue({ taskId: malformedTaskId });

    const logData = await waitForLogWhere('message-bus-handler-error', (data) => data.taskId === malformedTaskId);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(logData.failure).toBe('invalid-result');
    expect(app.log.getLogs().filter(([type, data]) => type === 'message-bus-handler-error' && data.taskId === malformedTaskId)).toHaveLength(1);
    expect(await queueMessageCount(app.config.message_queue.readingQueueName)).toBe(0);
  });

  it('works when the manager queues were declared raw before the bus starts', async () => {
    const config = {
      ...app.config,
      message_queue: { ...app.config.message_queue, readingQueueName: `compat-in-${randomUUID()}`, writingQueueTask: `compat-task-${randomUUID()}` },
    };
    const connection = await app.getTestConnection();
    const channel = await connection.createChannel();
    const channelError = jest.fn();
    channel.on('error', channelError);
    await channel.assertQueue(config.message_queue.readingQueueName, { durable: true });
    await channel.assertQueue(config.message_queue.writingQueueTask, { durable: true });

    const bus = createManagerMessageBus(config);
    const handler = jest.fn().mockResolvedValue(true);
    await bus.subscribe('manager', handler, { concurrency: 1 });
    await bus.init();
    try {
      channel.sendToQueue(config.message_queue.readingQueueName, Buffer.from(JSON.stringify({ taskId: 'x' })), { persistent: true });
      const start = Date.now();
      while (!handler.mock.calls.length && Date.now() - start < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(handler).toHaveBeenCalledTimes(1);
      await bus.publish('task', { ok: true });
      expect(channelError).not.toHaveBeenCalled();
    } finally {
      await bus.close();
      await channel.close().catch(() => undefined);
    }
  });

  it('routes an event message of a configured template to the specific event queue', async () => {
    const specialWorkflowId = randomUUID();
    const specialGatewayId = randomUUID();
    await getDb().query(
      `INSERT INTO workflow_templates (id, workflow_template_category_id, name, description, xml_bpmn_schema, data, created_at, updated_at, is_active, access_units, errors_subscribers)
       SELECT :specialTemplateId, workflow_template_category_id, name, description, xml_bpmn_schema, data, created_at, updated_at, is_active, access_units, errors_subscribers
       FROM workflow_templates WHERE id = :sourceId`,
      { replacements: { specialTemplateId: SPECIAL_WORKFLOW_TEMPLATE_ID, sourceId: WORKFLOW_TEMPLATE_ID } },
    );
    await getDb().query(
      `INSERT INTO workflows (id, workflow_template_id, is_final, data, created_by, updated_by, created_at, updated_at)
       VALUES (:specialWorkflowId, :specialTemplateId, false, '{"messages": []}'::jsonb, 'system', 'system', NOW(), NOW())`,
      { replacements: { specialWorkflowId, specialTemplateId: SPECIAL_WORKFLOW_TEMPLATE_ID } },
    );
    await getDb().query(
      `INSERT INTO gateways (id, gateway_template_id, gateway_type_id, workflow_id, data, created_by, updated_by, created_at, updated_at)
       VALUES (:specialGatewayId, :gatewayTemplateId, 1, :specialWorkflowId, :data::json, 'system', 'system', NOW(), NOW())`,
      {
        replacements: {
          specialGatewayId,
          gatewayTemplateId: GATEWAY_TEMPLATE_ID,
          specialWorkflowId,
          data: JSON.stringify({ resultSequence: 'Flow_1iyqzew' }),
        },
      },
    );

    await app.publishToReadingQueue({ gatewayId: specialGatewayId });

    const eventMessage = await app.consumeFromQueue(`${app.config.message_queue.writingQueueEvent}-special`);
    expect(eventMessage).toMatchObject({
      workflowId: specialWorkflowId,
      workflowTemplateId: SPECIAL_WORKFLOW_TEMPLATE_ID,
      eventTemplateId: EVENT_TEMPLATE_ID,
    });
  });

  it('drains in-flight work on SIGTERM, then exits once', async () => {
    const drainWorkflowId = randomUUID();
    const drainTaskId = randomUUID();
    await getDb().query(
      `INSERT INTO workflows (id, workflow_template_id, is_final, data, created_by, updated_by, created_at, updated_at)
       VALUES (:drainWorkflowId, :workflowTemplateId, false, '{"messages": []}'::jsonb, 'system', 'system', NOW(), NOW())`,
      { replacements: { drainWorkflowId, workflowTemplateId: WORKFLOW_TEMPLATE_ID } },
    );
    await getDb().query(
      `INSERT INTO tasks (id, workflow_id, task_template_id, performer_users, signer_users, performer_units, tags, data, finished, deleted, created_by, updated_by, created_at, updated_at)
       VALUES (:drainTaskId, :drainWorkflowId, :taskTemplateId, '{}', '{}', '{}', '{}', '{}'::json, true, false, 'system', 'system', NOW(), NOW())`,
      { replacements: { drainTaskId, drainWorkflowId, taskTemplateId: TASK_TEMPLATE_ID } },
    );
    const original = app.workflowBusiness.pushMessageToWorkflow.bind(app.workflowBusiness);
    let started: () => void;
    const startedPromise = new Promise<void>((resolve) => (started = resolve));
    jest.spyOn(app.workflowBusiness, 'pushMessageToWorkflow').mockImplementation(async (...args: any[]) => {
      started();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return original(...(args as [any, any, any, any]));
    });

    const emitter = new EventEmitter();
    const exit = jest.fn();
    registerShutdown({ routerService: app.routerService, messageBus: app.messageBus }, { processLike: emitter, exit });

    await app.publishToReadingQueue({ taskId: drainTaskId });
    await startedPromise;
    emitter.emit('SIGTERM');
    expect(exit).not.toHaveBeenCalled();

    const start = Date.now();
    while (!exit.mock.calls.length && Date.now() - start < 10000) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(exit).toHaveBeenCalledTimes(1);

    const outMessage = await app.consumeFromQueue(app.config.message_queue.writingQueueGateway);
    expect(outMessage).toMatchObject({ workflowId: drainWorkflowId });
    expect(await app.countQueueMessages(app.config.message_queue.readingQueueName)).toBe(0);
    expect(app.log.getLogs().some(([type]) => type === 'message-bus-settle-error')).toBe(false);
  });
});
