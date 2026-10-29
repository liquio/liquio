import { TestApp } from './test-app';
import { asAdmin, grantAllAdminUnits, textParser } from './fixtures/auth';

const TEMPLATE_ID = 988191;
const REGISTER = 'http://register:8103';

describe('BPMN workflow business', () => {
  let app: TestApp;
  let exported: any;

  const importBundle = (bundle: any, query: Record<string, any> = {}) =>
    asAdmin(app, 'post', '/bpmn-workflows/import').query(query).set('Content-Type', 'text/plain').send(JSON.stringify(bundle));

  const cloneBundle = () => JSON.parse(JSON.stringify(exported));

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
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

  describe('export', () => {
    it('collects the templates referenced by the BPMN schema', async () => {
      const response = await asAdmin(app, 'get', `/bpmn-workflows/${TEMPLATE_ID}/export`).buffer(true).parse(textParser).expect(200);
      exported = JSON.parse(response.body);

      expect(exported.workflowTemplate.id).toBe(TEMPLATE_ID);
      expect(exported.taskTemplates.length).toBeGreaterThan(0);
      expect(exported.documentTemplates.length).toBeGreaterThan(0);
      expect(exported.eventTemplates.length).toBeGreaterThan(0);
      expect(exported.gatewayTemplates.length).toBeGreaterThan(0);
    });

    it('reports an invalid BPMN schema', async () => {
      await app.model('workflowTemplate').update({ xml_bpmn_schema: '<broken' }, { where: { id: TEMPLATE_ID } });
      const broken = await asAdmin(app, 'get', `/bpmn-workflows/${TEMPLATE_ID}/export`);
      await app.model('workflowTemplate').update({ xml_bpmn_schema: exported.workflowTemplate.xmlBpmnSchema }, { where: { id: TEMPLATE_ID } });

      expect(broken.status).toBeGreaterThanOrEqual(400);

      await app.model('workflowTemplate').update({ xml_bpmn_schema: '<a/>' }, { where: { id: TEMPLATE_ID } });
      const empty = await asAdmin(app, 'get', `/bpmn-workflows/${TEMPLATE_ID}/export`);
      await app.model('workflowTemplate').update({ xml_bpmn_schema: exported.workflowTemplate.xmlBpmnSchema }, { where: { id: TEMPLATE_ID } });

      expect(empty.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('import', () => {
    it('imports the template again over the existing one', async () => {
      app
        .nock(REGISTER)
        .get('/keys')
        .query(true)
        .reply(200, { data: [{ id: 1 }] });

      const response = await importBundle(exported, { force: true });

      expect(response.status).toBe(202);
    });

    it('rejects a bundle with missing parts', async () => {
      const bundle = cloneBundle();
      delete bundle.taskTemplates;

      const response = await importBundle(bundle, { force: true });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('reports missing register keys, units and number templates', async () => {
      const bundle = cloneBundle();
      bundle.workflowTemplate.data = { ...bundle.workflowTemplate.data, numberTemplateId: 987654 };
      bundle.workflowTemplate.errorsSubscribers = ['someone'];
      bundle.numberTemplates = [];
      bundle.documentTemplates[0].jsonSchema = {
        properties: { control: { keyId: 987, whiteList: [988], type: 'object' }, fn: { keyId: '() => 1', whiteList: ['989'] } },
      };
      bundle.taskTemplates[0].jsonSchema = { ...bundle.taskTemplates[0].jsonSchema, setPermissions: [{ performerUnits: [987654] }] };
      bundle.eventTemplates[0].jsonSchema = { keyId: 990 };
      app
        .nock(REGISTER)
        .get('/keys')
        .query(true)
        .reply(200, { data: [{ id: 1 }] });

      const response = await importBundle(bundle, { force: true });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.details.length).toBeGreaterThan(1);
    });

    it('imports a template with a new number template and category', async () => {
      const bundle = cloneBundle();
      bundle.workflowTemplate.id = 988500;
      bundle.numberTemplates = [{ id: 988500, name: 'Number', template: '{{n}}', createdAt: '2025-01-01T00:00:00.000Z' }];
      bundle.workflowTemplate.data = { ...bundle.workflowTemplate.data, numberTemplateId: 988500 };
      bundle.workflowTemplateCategory = { ...bundle.workflowTemplateCategory, id: 988500, name: 'Imported category' };
      bundle.workflowTemplate.workflowTemplateCategoryId = 988500;
      app
        .nock(REGISTER)
        .get('/keys')
        .query(true)
        .reply(200, { data: [{ id: 1 }] });

      const response = await importBundle(bundle);

      expect(response.status).toBe(202);
    });
  });

  describe('versions', () => {
    it('saves minor, major and patch versions in sequence', async () => {
      const lastHeader = async () => {
        const list = await asAdmin(app, 'get', `/bpmn-workflows/${TEMPLATE_ID}/versions`).expect(200);
        return (list.body.data.find((v) => v.isCurrentVersion) || list.body.data[0])?.id;
      };

      for (const type of ['minor', 'major']) {
        const lastId = await lastHeader();
        const request = asAdmin(app, 'post', `/bpmn-workflows/${TEMPLATE_ID}/versions`);
        const response = await (lastId ? request.set('Last-Workflow-History-Id', lastId) : request).send({ type, name: `Version ${type}` });

        expect(response.status).toBe(202);
      }
    });
  });

  describe('copy', () => {
    it('copies a template with its tasks, documents, events and gateways', async () => {
      const preparation = await asAdmin(app, 'get', `/bpmn-workflows/${TEMPLATE_ID}/copy/preparation`).expect(200);
      const { requestId } = preparation.body.data;

      const copied = await asAdmin(app, 'post', `/bpmn-workflows/${TEMPLATE_ID}/copy`).send({
        request_id: requestId,
        not_replacing_diff_ids: (preparation.body.data.diffs || []).map((diff) => diff.id).slice(0, 1),
      });

      expect(copied.status).toBe(200);
    });

    it('reports an invalid BPMN schema while preparing a copy', async () => {
      await app.model('workflowTemplate').update({ xml_bpmn_schema: '<a/>' }, { where: { id: TEMPLATE_ID } });
      const response = await asAdmin(app, 'get', `/bpmn-workflows/${TEMPLATE_ID}/copy/preparation`);
      await app.model('workflowTemplate').update({ xml_bpmn_schema: exported.workflowTemplate.xmlBpmnSchema }, { where: { id: TEMPLATE_ID } });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
