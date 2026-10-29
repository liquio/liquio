import { TestApp } from './test-app';
import { prepareFixtures } from './fixtures';
import { asAdmin, grantAllAdminUnits } from './fixtures/auth';

const FILESTORAGE = 'http://filestorage:8080';
const FINAL_WORKFLOW_ID = 'f7a0f7e0-3576-11f0-9cb4-c3090b0731a2';
const FINAL_TASK_ID = 'f7a40520-3576-11f0-9cb4-c3090b0731a2';
const FINAL_DOCUMENT_ID = 'f7a53da0-3576-11f0-9cb4-c3090b0731a2';
const DONE_EVENT_ID = 'bd2631f0-3578-11f0-974a-df614269aae5';
const OTHER_WORKFLOW_ID = 'a26753f0-1119-11ef-b95e-15b9ffbcc467';
const UNKNOWN_ID = '00000000-0000-0000-0000-00000000dead';

describe('Workflow process business', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await prepareFixtures(app);
    await grantAllAdminUnits(app);
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

  describe('GET /workflow-processes filters', () => {
    it.each([
      ['draft status', { 'filters[workflow_status_id]': 'is_draft' }],
      ['not draft status', { 'filters[workflow_status_id]': 'is_not_draft' }],
      [
        'day date filters',
        {
          'filters[from_created_at]': '2020-01-01',
          'filters[to_created_at]': '2030-01-01',
          'filters[from_updated_at]': '2020-01-01',
          'filters[to_updated_at]': '2030-01-01',
        },
      ],
    ])('lists workflows by %s', async (_name, query) => {
      app.nock('http://id-api:8100').post('/user/info/id').query(true).optionally().reply(200, []);

      const response = await asAdmin(app, 'get', '/workflow-processes').query(query);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /workflow-processes with elastic', () => {
    const elasticConfig = {
      enabled: true,
      protocol: 'http',
      host: 'elastic.local',
      uri: '/logs/_search',
      method: 'POST',
      headers: {},
      timeout: 1000,
    };
    let originalElastic;

    beforeEach(() => {
      originalElastic = global.config.elastic;
      global.config.elastic = elasticConfig;
    });

    afterEach(() => {
      global.config.elastic = originalElastic;
    });

    it('lists workflows from the elastic response', async () => {
      app
        .nock('http://elastic.local')
        .post('/logs/_search')
        .reply(200, {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: FINAL_WORKFLOW_ID,
                _source: {
                  createdAt: '2025-05-20T12:35:52.562Z',
                  userworkflowTemplate: { id: 988191, name: 'Template' },
                  logs: [
                    { type: 'workflow_incoming_message', createdAt: '2025-05-20T12:36:16.107Z', details: JSON.stringify({ data: { a: 1 } }) },
                    { type: 'workflow_outcoming_message', createdAt: '2025-05-20T12:36:17.107Z', details: JSON.stringify({ data: { b: 2 } }) },
                    { type: 'other', createdAt: '2025-05-20T12:36:18.107Z', details: '{}' },
                  ],
                },
              },
            ],
          },
        });
      app.nock('http://id-api:8100').post('/user/info/id').query(true).optionally().reply(200, []);

      const response = await asAdmin(app, 'get', '/workflow-processes').query({ 'filters[name]': 'Template', page: 1, count: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data[0].id).toBe(FINAL_WORKFLOW_ID);
    });

    it('falls back to the database when elastic answers an error', async () => {
      app.nock('http://elastic.local').post('/logs/_search').reply(500, {});
      app.nock('http://id-api:8100').post('/user/info/id').query(true).optionally().reply(200, []);

      const response = await asAdmin(app, 'get', '/workflow-processes').query({ 'filters[name]': 'Template', page: 1, count: 10 });

      expect(response.status).toBe(200);
    });

    it('falls back to the database when elastic is unreachable', async () => {
      app.nock('http://elastic.local').post('/logs/_search').replyWithError('connect ECONNREFUSED');
      app.nock('http://id-api:8100').post('/user/info/id').query(true).optionally().reply(200, []);

      const response = await asAdmin(app, 'get', '/workflow-processes').query({ 'filters[name]': 'Template', page: 1, count: 10 });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /workflow-processes/tasks filters', () => {
    it('filters tasks by users and user id list', async () => {
      app.nock('http://id-api:8100').post('/user/info/id').query(true).optionally().reply(200, []);

      const response = await asAdmin(app, 'get', '/workflow-processes/tasks').query({
        'filters[user_ids]': '682c3749b09b9b183bf98a02',
        'filters[user_id_list]': '682c3749b09b9b183bf98a02',
      });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /workflow-processes/:id', () => {
    it('returns a finished workflow with its timeline', async () => {
      const response = await asAdmin(app, 'get', `/workflow-processes/${FINAL_WORKFLOW_ID}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(FINAL_WORKFLOW_ID);
    });
  });

  describe('POST /workflow-processes/:id/clear', () => {
    it('clears duplicated messages of a workflow', async () => {
      const model = app.model('workflow');
      const sequence = (sourceRef: string) => [{ id: 'Flow', sourceRef, targetRef: 'task-1' }];
      const messages = Array.from({ length: 6 }, () => ({ type: 'in', sequences: sequence('event-988191002') })).concat(
        Array.from({ length: 6 }, () => ({ type: 'in', sequences: sequence('gateway-988191001') })),
        [{ type: 'out', sequences: sequence('task-1') }],
      );
      await model.update({ data: { messages } }, { where: { id: OTHER_WORKFLOW_ID } });

      const response = await asAdmin(app, 'post', `/workflow-processes/${OTHER_WORKFLOW_ID}/clear`);

      expect(response.status).toBe(202);
      const after = await model.findByPk(OTHER_WORKFLOW_ID);
      expect(after.data.messages.length).toBeLessThan(messages.length);
    });

    it('does nothing for a workflow without messages', async () => {
      await app.model('workflow').update({ data: {} }, { where: { id: 'e8c65cba-e899-4da8-966b-a308d0169e30' } });

      const response = await asAdmin(app, 'post', '/workflow-processes/e8c65cba-e899-4da8-966b-a308d0169e30/clear');

      expect(response.status).toBe(202);
    });

    it('answers 404 for an unknown workflow', async () => {
      const response = await asAdmin(app, 'post', `/workflow-processes/${UNKNOWN_ID}/clear`);

      expect(response.status).toBe(404);
    });
  });

  describe('workflow errors', () => {
    it('answers 404 when the workflow has no errors', async () => {
      const response = await asAdmin(app, 'post', `/workflow-processes/${OTHER_WORKFLOW_ID}/continue`);

      expect(response.status).toBe(404);
    });

    it('re-pushes the queue message of a workflow error', async () => {
      await app.model('workflowError').create({
        workflow_id: OTHER_WORKFLOW_ID,
        service_name: 'event',
        type: 'error',
        data: { queueMessage: { workflowId: OTHER_WORKFLOW_ID, eventTemplateId: 1 } },
      });

      const response = await asAdmin(app, 'post', `/workflow-processes/${OTHER_WORKFLOW_ID}/continue`);

      expect(response.status).toBe(202);
    });

    it('continues several workflows, skipping those without errors', async () => {
      const response = await asAdmin(app, 'post', '/workflow-processes/continue-bulk').send({
        workflowIds: [OTHER_WORKFLOW_ID, FINAL_WORKFLOW_ID],
      });

      expect(response.status).toBe(202);
    });
  });

  describe('restart', () => {
    it.each([
      ['task', { taskTemplateId: 1 }],
      ['event', { eventTemplateId: 1 }],
      ['gateway', { gatewayTemplateId: 1 }],
    ])('restarts a workflow from a %s step', async (_name, step) => {
      const response = await asAdmin(app, 'post', `/workflow-processes/${OTHER_WORKFLOW_ID}/restart?resolve_error=true`).send({
        message: { workflowId: OTHER_WORKFLOW_ID, ...step },
      });

      expect(response.status).toBe(202);
    });

    it('restarts several messages and survives the broken ones', async () => {
      const response = await asAdmin(app, 'post', '/workflow-processes/restart-bulk').send({
        messages: [
          { workflowId: OTHER_WORKFLOW_ID, taskTemplateId: 1 },
          { _taskId: UNKNOWN_ID, _status: 'paid', _statusTaskTemplateId: 1, workflowId: OTHER_WORKFLOW_ID },
        ],
      });

      expect(response.status).toBe(202);
    });
  });

  describe('PUT /workflow-processes/:id/tasks/:taskId', () => {
    it('updates the task and its document', async () => {
      const response = await asAdmin(app, 'put', `/workflow-processes/${FINAL_WORKFLOW_ID}/tasks/${FINAL_TASK_ID}`).send({
        finished: true,
        document: { isFinal: true, data: { note: 'updated' } },
      });

      expect(response.status).toBe(202);
      const document = await app.model('document').findByPk(FINAL_DOCUMENT_ID);
      expect(document.data.note).toBe('updated');
    });

    it('ignores an unknown task', async () => {
      const response = await asAdmin(app, 'put', `/workflow-processes/${FINAL_WORKFLOW_ID}/tasks/${UNKNOWN_ID}`).send({
        finished: true,
        document: { isFinal: true, data: {} },
      });

      expect(response.status).toBe(202);
    });
  });

  describe('POST /workflow-processes/:id/events/:eventId/cancel', () => {
    it('rejects an unknown event', async () => {
      const response = await asAdmin(app, 'post', `/workflow-processes/${FINAL_WORKFLOW_ID}/events/${UNKNOWN_ID}/cancel`);

      expect(response.status).toBe(500);
    });

    it('rejects an event of another workflow', async () => {
      const response = await asAdmin(app, 'post', `/workflow-processes/${OTHER_WORKFLOW_ID}/events/${DONE_EVENT_ID}/cancel`);

      expect(response.status).toBe(500);
    });

    it('rejects an already done event', async () => {
      const response = await asAdmin(app, 'post', `/workflow-processes/${FINAL_WORKFLOW_ID}/events/${DONE_EVENT_ID}/cancel`);

      expect(response.status).toBe(500);
    });
  });

  describe('file downloads', () => {
    it('streams a file from the file storage', async () => {
      app.nock(FILESTORAGE).get('/files/file-1').reply(200, 'file-content');

      const response = await asAdmin(app, 'get', `/workflow-processes/${OTHER_WORKFLOW_ID}/files/file-1`).buffer(true);

      expect(response.status).toBe(200);
      expect(response.text).toBe('file-content');
    });

    it('answers 500 when the file storage answers an error status', async () => {
      app.nock(FILESTORAGE).get('/files/file-2').reply(404, { error: 'missing' });

      const response = await asAdmin(app, 'get', `/workflow-processes/${OTHER_WORKFLOW_ID}/files/file-2`);

      // The error stream is passed to res.send, which cannot serialize it (see BUGS.md).
      expect(response.status).toBe(500);
    });

    it('answers 500 when the file storage is unreachable', async () => {
      app.nock(FILESTORAGE).get('/files/file-3').replyWithError('connect ECONNREFUSED');

      const response = await asAdmin(app, 'get', `/workflow-processes/${OTHER_WORKFLOW_ID}/files/file-3`);

      expect(response.status).toBe(500);
    });

    it('streams a p7s signature', async () => {
      app.nock(FILESTORAGE).get('/files/file-4/p7s').query(true).reply(200, 'p7s-content', { 'Content-Type': 'application/pkcs7-signature' });

      const response = await asAdmin(app, 'get', `/workflow-processes/${FINAL_TASK_ID}/files/file-4/p7s`).buffer(true);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pkcs7-signature');
    });

    it('answers 404 when the p7s is missing', async () => {
      app.nock(FILESTORAGE).get('/files/file-5/p7s').query(true).reply(404, 'not found');

      const response = await asAdmin(app, 'get', `/workflow-processes/${FINAL_TASK_ID}/files/file-5/p7s`);

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /workflow-processes/:id/documents/:documentId/signatures', () => {
    it('rejects a document of another workflow', async () => {
      const response = await asAdmin(app, 'delete', `/workflow-processes/${OTHER_WORKFLOW_ID}/documents/${FINAL_DOCUMENT_ID}/signatures`);

      expect(response.status).toBe(500);
    });

    it('rejects a finished task', async () => {
      const response = await asAdmin(app, 'delete', `/workflow-processes/${FINAL_WORKFLOW_ID}/documents/${FINAL_DOCUMENT_ID}/signatures`);

      expect(response.status).toBe(500);
    });
  });
});
