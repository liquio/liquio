import { TestApp } from './test-app';
import { prepareFixtures, WORKFLOW_FIXTURES } from './fixtures';
import { asAdmin, grantAllAdminUnits } from './fixtures/auth';

const TEMPLATE_ID = 161070;
const BPMN_XML =
  '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1">' +
  '<bpmn:process id="Process_161070" isExecutable="true"><bpmn:startEvent id="StartEvent_1"/><bpmn:task id="task-161070001"/>' +
  '<bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="task-161070001"/></bpmn:process></bpmn:definitions>';
const LIMITED_USER = 'dddddddddddddddddddddd01';

const documentTemplate = {
  id: 161070101,
  name: 'Document',
  jsonSchema: { type: 'object', properties: {} },
  jsonSchemaRaw: '{}',
  htmlTemplate: '<div></div>',
  accessJsonSchema: {},
};
const taskTemplate = {
  id: 161070002,
  name: 'Task',
  documentTemplateId: 161070101,
  jsonSchema: { type: 'object' },
  jsonSchemaRaw: '{}',
  htmlTemplate: '<div></div>',
};
const eventTemplate = {
  workflowTemplateId: TEMPLATE_ID,
  id: 161070201,
  eventTypeId: 2,
  name: 'Delay',
  description: 'Delay event',
  jsonSchema: { dueDate: 'x' },
  jsonSchemaRaw: '{}',
  htmlTemplate: '<div></div>',
};
const gatewayTemplate = {
  workflowTemplateId: TEMPLATE_ID,
  id: 161070301,
  gatewayTypeId: 1,
  name: 'Gateway',
  description: 'Exclusive gateway',
  jsonSchema: {},
  jsonSchemaRaw: '{}',
};

describe('Task, event and gateway template controllers', () => {
  let app: TestApp;
  let lastHistoryId: string;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await prepareFixtures(app);
    await grantAllAdminUnits(app);
    await app.model('workflowTemplate').update({ xml_bpmn_schema: BPMN_XML }, { where: { id: TEMPLATE_ID } });
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

  describe('access control and validation', () => {
    it('requires authentication and unit membership', async () => {
      await app.request().post('/tasks').send([]).expect(401);
      await app.request().get('/events/1').expect(401);
      await asAdmin(app, 'post', '/tasks', LIMITED_USER).send([]).expect(403);
      await asAdmin(app, 'delete', '/gateways/1', LIMITED_USER).expect(403);
    });

    it('validates request bodies and ids', async () => {
      await asAdmin(app, 'post', '/tasks').send({ not: 'an array' }).expect(422);
      await asAdmin(app, 'post', '/events')
        .send([{ id: 1 }])
        .expect(422);
      await asAdmin(app, 'post', '/gateways')
        .send([{ id: 1 }])
        .expect(422);
      await asAdmin(app, 'get', '/tasks/abc').expect(422);
      await asAdmin(app, 'get', '/events/abc').expect(422);
      await asAdmin(app, 'get', '/gateways/abc').expect(422);
      await asAdmin(app, 'post', '/events/abc/skip-delay').expect(422);
    });
  });

  describe('task templates', () => {
    it('creates a task and document template and auto-saves a workflow version', async () => {
      const response = await asAdmin(app, 'post', '/tasks')
        .send([{ workflowTemplateId: TEMPLATE_ID, taskTemplate, documentTemplate }])
        .expect(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].taskTemplateEntity.id).toBe(taskTemplate.id);
      lastHistoryId = response.headers['last-workflow-history-id'];
      expect(lastHistoryId).toEqual(expect.any(String));
    });

    it('rejects a change that is based on an expired workflow history', async () => {
      const response = await asAdmin(app, 'post', '/tasks').send([{ workflowTemplateId: TEMPLATE_ID, taskTemplate, documentTemplate }]);
      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe('Header Last-Workflow-History-Id expired.');
    });

    it('updates an existing template with the current history header', async () => {
      const response = await asAdmin(app, 'post', '/tasks')
        .set('Last-Workflow-History-Id', lastHistoryId)
        .send([{ workflowTemplateId: TEMPLATE_ID, taskTemplate: { ...taskTemplate, name: 'Task renamed' }, documentTemplate }])
        .expect(200);
      expect(response.body.data[0].taskTemplateEntity.name).toBe('Task renamed');
      lastHistoryId = response.headers['last-workflow-history-id'] || lastHistoryId;
    });

    it('reads and deletes a task template', async () => {
      const found = await asAdmin(app, 'get', `/tasks/${taskTemplate.id}`).expect(200);
      expect(found.body.data.taskTemplateEntity.id).toBe(taskTemplate.id);
      await asAdmin(app, 'get', '/tasks/987654').expect(404);

      await asAdmin(app, 'delete', `/tasks/${taskTemplate.id}`).expect(202);
      await asAdmin(app, 'get', `/tasks/${taskTemplate.id}`).expect(404);
    });

    it('refuses to change templates when the workflow editor is disabled', async () => {
      const previous = global.config.workflow_editor;
      global.config.workflow_editor = { disabled: true };
      try {
        const created = await asAdmin(app, 'post', '/tasks').send([{ workflowTemplateId: TEMPLATE_ID, taskTemplate, documentTemplate }]);
        expect(created.status).toBeGreaterThanOrEqual(400);
        const deleted = await asAdmin(app, 'delete', `/tasks/${taskTemplate.id}`);
        expect(deleted.status).toBeGreaterThanOrEqual(400);
        const event = await asAdmin(app, 'post', '/events').send([eventTemplate]);
        expect(event.status).toBeGreaterThanOrEqual(400);
        const gateway = await asAdmin(app, 'post', '/gateways').send([gatewayTemplate]);
        expect(gateway.status).toBeGreaterThanOrEqual(400);
        await asAdmin(app, 'delete', '/events/161070201');
        await asAdmin(app, 'delete', '/gateways/161070301');
      } finally {
        global.config.workflow_editor = previous;
      }
    });
  });

  describe('event templates', () => {
    it('creates, reads and deletes an event template', async () => {
      const created = await asAdmin(app, 'post', '/events').set('Last-Workflow-History-Id', lastHistoryId).send([eventTemplate]).expect(200);
      expect(created.body.data.length).toBe(1);
      lastHistoryId = created.headers['last-workflow-history-id'] || lastHistoryId;

      const found = await asAdmin(app, 'get', `/events/${eventTemplate.id}`).expect(200);
      expect(found.body.data).toBeDefined();
      await asAdmin(app, 'get', '/events/987654').expect(404);

      await asAdmin(app, 'delete', `/events/${eventTemplate.id}`).expect(202);
    });

    it('rejects a change with an expired history header', async () => {
      const response = await asAdmin(app, 'post', '/events').set('Last-Workflow-History-Id', 'expired').send([eventTemplate]);
      expect(response.status).toBe(500);
    });
  });

  describe('gateway templates', () => {
    it('creates, reads and deletes a gateway template', async () => {
      const created = await asAdmin(app, 'post', '/gateways').set('Last-Workflow-History-Id', lastHistoryId).send([gatewayTemplate]).expect(200);
      expect(created.body.data.length).toBe(1);
      lastHistoryId = created.headers['last-workflow-history-id'] || lastHistoryId;

      const found = await asAdmin(app, 'get', `/gateways/${gatewayTemplate.id}`).expect(200);
      expect(found.body.data).toBeDefined();
      await asAdmin(app, 'get', '/gateways/987654').expect(404);

      await asAdmin(app, 'delete', `/gateways/${gatewayTemplate.id}`).expect(202);
    });

    it('rejects a change with an expired history header', async () => {
      const response = await asAdmin(app, 'post', '/gateways').set('Last-Workflow-History-Id', 'expired').send([gatewayTemplate]);
      expect(response.status).toBe(500);
    });
  });

  describe('skip delay of an event instance', () => {
    it('skips the delay of a pending delay event and refuses to skip it twice', async () => {
      await app.model('eventTemplate').create({
        id: 161070401,
        workflow_template_id: TEMPLATE_ID,
        event_type_id: 2,
        name: 'Delay template',
        description: '',
        json_schema: '{}',
        json_schema_raw: '{}',
        html_template: '',
      });
      const future = new Date(Date.now() + 60 * 60 * 1000);
      const event = await app.model('event').create({
        event_template_id: 161070401,
        event_type_id: 2,
        workflow_id: WORKFLOW_FIXTURES[0].id,
        name: 'Delay',
        done: false,
        created_by: 'test',
        updated_by: 'test',
        data: { dueDate: future },
        due_date: future,
      });

      const skipped = await asAdmin(app, 'post', `/events/${event.id}/skip-delay`).expect(200);
      expect(skipped.body.data).toBeDefined();

      const again = await asAdmin(app, 'post', `/events/${event.id}/skip-delay`);
      expect(again.status).toBe(500);
      expect(again.body.error.message).toBe('Event already skipped.');
    });
  });
});
