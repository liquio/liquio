import { randomUUID, randomBytes } from 'node:crypto';

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
    await global.db.query(
      `INSERT INTO gateway_templates (id, gateway_type_id, "name", description, json_schema, created_at, updated_at)
       VALUES (:id, 2, 'Parallel test gateway', '', '{}', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      { replacements: { id: PARALLEL_GATEWAY_TEMPLATE_ID } },
    );

    // Seed an inclusive gateway template (branch-free: always forwards every incoming sequence).
    await global.db.query(
      `INSERT INTO gateway_templates (id, gateway_type_id, "name", description, json_schema, created_at, updated_at)
       VALUES (:id, 3, 'Inclusive test gateway', '', '{}', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      { replacements: { id: INCLUSIVE_GATEWAY_TEMPLATE_ID } },
    );
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

    await global.db.query(
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

    const [gatewayRow] = await global.db.query(
      'SELECT gateway_type_id, gateway_template_id, "data" FROM gateways WHERE id = :id',
      { replacements: { id: outMessage.gatewayId }, type: 'SELECT' },
    );
    expect(gatewayRow).toMatchObject({ gateway_type_id: 2, gateway_template_id: PARALLEL_GATEWAY_TEMPLATE_ID });
    expect(gatewayRow.data).toEqual({ resultSequences: sequenceIds });
  });

  it('processes an inclusive gateway and forwards every incoming sequence unchanged', async () => {
    const workflowId = randomUUID();
    const sequenceIds = ['Flow_inclusive_a'];

    await global.db.query(
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

    const [gatewayRow] = await global.db.query(
      'SELECT gateway_type_id, "data" FROM gateways WHERE id = :id',
      { replacements: { id: outMessage.gatewayId }, type: 'SELECT' },
    );
    expect(gatewayRow).toMatchObject({ gateway_type_id: 3 });
    expect(gatewayRow.data).toEqual({ resultSequences: sequenceIds });
  });

  it('processes an exclusive gateway and forwards only the matching branch', async () => {
    const workflowId = randomUUID();
    const documentId = randomUUID();
    const taskId = randomUUID();
    const sequenceIds = ['Flow_15yf3yt', 'Flow_1iyqzew']; // ['Ні', 'Так'], matching formula order.

    await global.db.query(
      `INSERT INTO workflows (id, workflow_template_id, is_final, data, created_by, updated_by, created_at, updated_at)
       VALUES (:workflowId, 988191, false, '{}'::jsonb, 'system', 'system', NOW(), NOW())`,
      { replacements: { workflowId } },
    );

    await global.db.query(
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

    await global.db.query(
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

    const [gatewayRow] = await global.db.query(
      'SELECT gateway_type_id, "data" FROM gateways WHERE id = :id',
      { replacements: { id: outMessage.gatewayId }, type: 'SELECT' },
    );
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

    await app.publishToReadingQueue({
      workflowId,
      gatewayTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID,
      workflowTemplateId: PARALLEL_GATEWAY_TEMPLATE_ID,
      sequenceIds,
      debugId,
    });

    // The debug branch doesn't log or produce a queue message, so poll for the row it writes.
    const debugRow = await waitForRow(
      () => global.db.query('SELECT workflow_id, service_name, "data" FROM workflow_debug WHERE id = :id', {
        replacements: { id: debugId },
        type: 'SELECT',
      }),
    );
    expect(debugRow).toMatchObject({ workflow_id: workflowId, service_name: 'gateway' });
    expect(debugRow.data.result).toEqual({ resultSequences: sequenceIds });
  });

  it('logs and swallows a gateway-template-not-found error instead of crashing the consumer', async () => {
    const workflowId = randomUUID();

    await app.publishToReadingQueue({
      workflowId,
      gatewayTemplateId: 999999999,
      sequenceIds: [],
    });

    const [, logData] = await app.log.waitForLog('document-creating-by-message-from-queue-error');
    expect(logData.messageObject).toMatchObject({ workflowId, gatewayTemplateId: 999999999 });

    // The system notifier attempts a real HTTP call to a non-listening test host and fails,
    // which is itself logged rather than crashing the consumer.
    await app.log.waitForLog('system-notifier-error');
  });
});
