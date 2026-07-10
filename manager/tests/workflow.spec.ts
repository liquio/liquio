import { randomUUID } from 'crypto';

import { TestApp } from './test-app';

// Workflow template 988191, seeded by data/test.e2e.sql, flows:
// task-988191001 --Flow_1twkt51--> gateway-988191001 (exclusive gateway).
const WORKFLOW_TEMPLATE_ID = 988191;
const TASK_TEMPLATE_ID = 988191001;
const GATEWAY_TEMPLATE_ID = 988191001;

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
});
