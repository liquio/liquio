import { TestApp } from './test-app';
import { prepareFixtures } from './fixtures';
import { asAdmin, grantAllAdminUnits, textParser } from './fixtures/auth';
import { getConfig } from '../src/lib/context';

const TEMPLATE_ID = 161070;
const REGISTER = 'http://register:8103';
const LIMITED_USER = 'dddddddddddddddddddddd01';

const BPMN_XML =
  '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1">' +
  '<bpmn:process id="Process_161070" isExecutable="true"><bpmn:startEvent id="StartEvent_1"/><bpmn:task id="task-161070001"/>' +
  '<bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="task-161070001"/></bpmn:process></bpmn:definitions>';

describe('BPMN workflow controller', () => {
  let app: TestApp;

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

  describe('access control', () => {
    it('requires authentication and the system admin unit', async () => {
      await app.request().get(`/bpmn-workflows/${TEMPLATE_ID}/export`).expect(401);
      await asAdmin(app, 'get', `/bpmn-workflows/${TEMPLATE_ID}/export`, LIMITED_USER).expect(403);
      await asAdmin(app, 'post', '/bpmn-workflows/import', LIMITED_USER).expect(403);
    });

    it('validates the template id', async () => {
      await asAdmin(app, 'get', '/bpmn-workflows/abc/export').expect(422);
      await asAdmin(app, 'get', '/bpmn-workflows/abc/versions').expect(422);
    });
  });

  describe('export and import', () => {
    let exported: string;

    it('exports a workflow template with its schema', async () => {
      const response = await asAdmin(app, 'get', `/bpmn-workflows/${TEMPLATE_ID}/export`).buffer(true).parse(textParser).expect(200);
      exported = response.body;
      expect(response.headers['content-type']).toContain('application/bpmn');
      const parsed = JSON.parse(exported);
      expect(parsed.workflowTemplate.id).toBe(TEMPLATE_ID);
    });

    it('answers 404 or an error for an unknown template', async () => {
      const response = await asAdmin(app, 'get', '/bpmn-workflows/987654/export');
      expect(response.status).toBe(404);
    });

    it('imports an exported template over the existing one when forced', async () => {
      app.nock(REGISTER).get('/keys').query(true).reply(200, { data: [] });
      await asAdmin(app, 'post', '/bpmn-workflows/import').query({ force: true }).set('Content-Type', 'text/plain').send(exported).expect(202);
    });

    it('rejects an import without force when the template exists', async () => {
      const response = await asAdmin(app, 'post', '/bpmn-workflows/import').set('Content-Type', 'text/plain').send(exported);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects invalid JSON and invalid data', async () => {
      const invalidJson = await asAdmin(app, 'post', '/bpmn-workflows/import').set('Content-Type', 'text/plain').send('{broken');
      expect(invalidJson.status).toBe(400);
      expect(invalidJson.body.error.message).toBe('Invalid JSON in import file.');

      const invalidData = await asAdmin(app, 'post', '/bpmn-workflows/import').set('Content-Type', 'text/plain').send('{}');
      expect(invalidData.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects an oversized import by the declared length', async () => {
      const previous = getConfig().bpmnImport;
      getConfig().bpmnImport = { maxBytes: 10 };
      try {
        const response = await asAdmin(app, 'post', '/bpmn-workflows/import').set('Content-Type', 'text/plain').send('x'.repeat(200));
        expect(response.status).toBe(413);
      } finally {
        getConfig().bpmnImport = previous;
      }
    });
  });

  describe('versions', () => {
    it('saves versions and reads them back', async () => {
      const before = await asAdmin(app, 'get', `/bpmn-workflows/${TEMPLATE_ID}/versions`).expect(200);
      const lastId = (before.body.data.find((v) => v.isCurrentVersion) || before.body.data[0])?.id;
      const request = asAdmin(app, 'post', `/bpmn-workflows/${TEMPLATE_ID}/versions`);
      await (lastId ? request.set('Last-Workflow-History-Id', lastId) : request)
        .send({ type: 'minor', name: 'First', description: 'Initial' })
        .expect(202);

      const list = await asAdmin(app, 'get', `/bpmn-workflows/${TEMPLATE_ID}/versions`).expect(200);
      expect(list.body.data.length).toBeGreaterThan(0);
      const version = list.body.data[0];
      expect(version.workflowTemplateId).toBe(TEMPLATE_ID);

      const found = await asAdmin(app, 'get', `/bpmn-workflows/${TEMPLATE_ID}/versions/${version.version}`).expect(200);
      expect(found.body.data).toBeDefined();
    });

    it('requires the last workflow history header once a version exists', async () => {
      const response = await asAdmin(app, 'post', `/bpmn-workflows/${TEMPLATE_ID}/versions`).send({ type: 'major', name: 'Second' });
      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe('Header Last-Workflow-History-Id expired.');

      const list = await asAdmin(app, 'get', `/bpmn-workflows/${TEMPLATE_ID}/versions`).expect(200);
      const last = list.body.data.find((v) => v.isCurrentVersion) || list.body.data[0];
      const accepted = await asAdmin(app, 'post', `/bpmn-workflows/${TEMPLATE_ID}/versions`)
        .set('Last-Workflow-History-Id', last.id)
        .send({ type: 'major', name: 'Second' });
      expect(accepted.status).toBe(202);
      expect(accepted.headers['last-workflow-history-id']).toEqual(expect.any(String));
    });

    it('validates the version body', async () => {
      await asAdmin(app, 'post', `/bpmn-workflows/${TEMPLATE_ID}/versions`).send({ name: 'No type' }).expect(422);
    });

    it('answers 404 when saving a version of an unknown template', async () => {
      const response = await asAdmin(app, 'post', '/bpmn-workflows/987654/versions').send({ type: 'minor', name: 'x' });
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('copy', () => {
    it('prepares and performs a copy of the template', async () => {
      const preparation = await asAdmin(app, 'get', `/bpmn-workflows/${TEMPLATE_ID}/copy/preparation`).expect(200);
      const { requestId } = preparation.body.data;
      expect(requestId).toEqual(expect.any(String));

      const copied = await asAdmin(app, 'post', `/bpmn-workflows/${TEMPLATE_ID}/copy`).send({ request_id: requestId, not_replacing_diff_ids: [] });
      expect(copied.status).toBe(200);
      expect(copied.body.data).toBeDefined();
    });

    it('fails to copy without a prepared request', async () => {
      const response = await asAdmin(app, 'post', `/bpmn-workflows/${TEMPLATE_ID}/copy`).send({
        request_id: 'unknown-request',
        not_replacing_diff_ids: [],
      });
      expect(response.status).toBe(500);
    });

    it('answers 404 when preparing a copy of an unknown template', async () => {
      await asAdmin(app, 'get', '/bpmn-workflows/987654/copy/preparation').expect(404);
    });
  });

  describe('error subscribers', () => {
    it('subscribes and unsubscribes the current user', async () => {
      const subscribed = await asAdmin(app, 'post', `/bpmn-workflows/${TEMPLATE_ID}/errors-subscribers`).send({}).expect(200);
      expect(subscribed.body.data.errorsSubscribers.length).toBe(1);

      const unsubscribed = await asAdmin(app, 'delete', `/bpmn-workflows/${TEMPLATE_ID}/errors-subscribers`).send({}).expect(200);
      expect(unsubscribed.body.data.errorsSubscribers).toEqual([]);
    });
  });
});
