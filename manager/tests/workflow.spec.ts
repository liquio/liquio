import { randomUUID } from 'crypto';

import { TestApp } from './test-app';

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

    await global.db.query(
      `INSERT INTO workflows (id, workflow_template_id, is_final, data, created_by, updated_by, created_at, updated_at)
       VALUES (:workflowId, :workflowTemplateId, false, '{"messages": []}'::jsonb, 'system', 'system', NOW(), NOW())`,
      { replacements: { workflowId, workflowTemplateId: WORKFLOW_TEMPLATE_ID } },
    );

    await global.db.query(
      `INSERT INTO tasks (id, workflow_id, task_template_id, performer_users, signer_users, performer_units, tags, data, finished, deleted, created_by, updated_by, created_at, updated_at)
       VALUES (:taskId, :workflowId, :taskTemplateId, '{}', '{}', '{}', '{}', '{}'::json, false, false, 'system', 'system', NOW(), NOW())`,
      { replacements: { taskId, workflowId, taskTemplateId: TASK_TEMPLATE_ID } },
    );
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  it('forwards a forwardToTask message straight to the task queue', async () => {
    const message = { forwardToTask: true, taskTemplateId: TASK_TEMPLATE_ID, foo: 'bar' };
    await app.publishToReadingQueue(message);

    const taskMessage = await app.consumeFromQueue(app.config.message_queue.writingQueueTask);

    expect(taskMessage).toEqual(message);
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

    await global.db.query(
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

    await global.db.query(
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

    expect(logData.error.message).toBe('Invalid message object.');
  });
});
