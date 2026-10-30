import { TestApp } from './test-app';
import { seedScenario, addTemplatePair, addUnit, userRequest, SCENARIO } from './helpers/scenario';
import { getBusinesses, getConfig, getMessageQueue, getRedisClient, setAppContext } from '../src/lib/context';

const USER = SCENARIO.userId;
const BASIC_RAW = 'ZG9jczpkb2Nz'; // fake "docs:docs"
const MISSING = '00000000-0000-4000-8000-000000000000';

// Document routes that run through DocumentController into the document business with real tasks:
// read by an external service, validation with commit, attachment upload, back calculation and external reader checks.
describe('Document controller flows', () => {
  let app: TestApp;
  let nextId = 990480;
  const as = (userId = USER) => userRequest(app, userId);
  const document = () => (getBusinesses() as any).document;

  const draft = async (documentSchema: any = {}, data?: any) => {
    const id = nextId++;
    await addTemplatePair(app, id, {}, { required: [], ...documentSchema });
    const created = await as()('post', '/tasks').send({ workflowTemplateId: SCENARIO.workflowTemplateId, taskTemplateId: id });
    expect(created.status).toBe(200);
    if (data) {
      await app.model('document').update({ data }, { where: { id: created.body.data.documentId } });
    }
    return created.body.data;
  };
  const stored = async (task: any) => (await app.model('document').findByPk(task.documentId)).data;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await seedScenario(app);
    await addUnit(app, { id: 990061, name: 'Document unit', heads: [USER], members: [USER], heads_ipn: [], members_ipn: [] });
    getConfig().basic_auth.tokens.push(BASIC_RAW);
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  describe('GET /external_services/documents/:id', () => {
    const read = (id: string) => app.request().get(`/external_services/documents/${id}`).set('Authorization', `Basic ${BASIC_RAW}`);

    it('returns the document only for an allowed template of the integration user', async () => {
      const task = await draft();
      const config = getConfig();
      config.external_services = { ...config.external_services, getDocumentWithTemplateIdsByUser: {} };
      expect((await read(MISSING)).status).toBe(404);
      expect((await read(task.documentId)).status).toBe(401);
      config.external_services.getDocumentWithTemplateIdsByUser = { docs: [task.document.documentTemplateId] };
      const ok = await read(task.documentId);
      expect(ok.status).toBe(200);
      expect(ok.body.data.id).toBe(task.documentId);
    });
  });

  describe('POST /documents/:id/validate', () => {
    it('reports validation errors, then validates and commits the task', async () => {
      const task = await draft({ required: ['name'] });
      const invalid = await as()('post', `/documents/${task.documentId}/validate`).send({});
      expect(invalid.status).toBeGreaterThanOrEqual(400);
      await app.model('document').update({ data: { name: 'Valid' } }, { where: { id: task.documentId } });
      const valid = await as()('post', `/documents/${task.documentId}/validate`).send({});
      expect(valid.status).toBe(200);
      jest.spyOn(getMessageQueue(), 'produce').mockResolvedValue(undefined as any);
      const committed = await as()('post', `/documents/${task.documentId}/validate`).query({ commit: 'true' }).send({});
      expect(committed.status).toBe(200);
      expect((await app.model('task').findByPk(task.id)).finished).toBe(true);
      const again = await as()('post', `/documents/${task.documentId}/validate`).query({ commit: 'true' }).send({});
      expect(again.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects an expired draft', async () => {
      const task = await draft({}, { name: 'Valid' });
      await app.model('task').update({ draft_expired_at: new Date(Date.now() - 60000) }, { where: { id: task.id } });
      const response = await as()('post', `/documents/${task.documentId}/validate`).send({});
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /documents/:id/attachments', () => {
    const upload = (task: any, query: any, body: any = 'hello') =>
      as()('post', `/documents/${task.documentId}/attachments`).query(query).set('Content-Type', 'text/plain').send(body);

    it('rejects a forbidden extension and invalid meta', async () => {
      const config = getConfig();
      config.documents = { ...config.documents, allowedFileExtensions: ['.TXT'] };
      const task = await draft();
      expect((await upload(task, { file_name: 'bad.exe' })).status).toBe(400);
      expect((await upload(task, { file_name: 'a.txt', meta: '5' })).status).toBe(400);
    });

    it('stores the uploaded file as an attachment and references it in the document data', async () => {
      const config = getConfig();
      config.documents = { ...config.documents, allowedFileExtensions: ['.TXT'] };
      const task = await draft({ properties: { name: { type: 'string' }, files: { type: 'array', items: { type: 'object' } } } });
      const send = jest
        .spyOn(document().files.host.storageService.provider, 'uploadFileFromStream')
        .mockResolvedValue({ id: 'uploaded-file' } as any);
      const response = await upload(task, {
        file_name: 'a/b.txt',
        labels: ['l1', 'l2'],
        meta: encodeURIComponent(JSON.stringify({ k: 'v' })),
        document_path: 'files.0',
      });
      expect(response.status).toBe(200);
      expect(send).toHaveBeenCalledWith(expect.anything(), 'a_b.txt', undefined, 'text/plain', expect.anything());
      const attachment = await app.model('documentAttachment').findOne({ where: { document_id: task.documentId } });
      expect(attachment.link).toBe('uploaded-file');
      expect(attachment.labels).toEqual(['l1', 'l2']);
      expect((await stored(task)).files[0].link).toBe('uploaded-file');
      send.mockRejectedValueOnce(new Error('storage down'));
      expect((await upload(task, { file_name: 'c.txt' })).status).toBeGreaterThanOrEqual(400);
      expect(
        (await as()('post', `/documents/${MISSING}/attachments`).query({ file_name: 'c.txt' }).set('Content-Type', 'text/plain').send('x')).status,
      ).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /documents/:id/calc', () => {
    const schema = {
      properties: {
        name: { type: 'string' },
        total: { type: 'number', calcBackTriggered: '(data) => (data.name || "").length' },
        broken: { type: 'string', calcBackTriggered: '() => { throw new Error("x"); }' },
      },
    };

    it('recalculates a property on demand', async () => {
      const task = await draft(schema, { name: 'Alice' });
      const ok = await as()('post', `/documents/${task.documentId}/calc`).send({ path: 'total' });
      expect(ok.status).toBe(200);
      expect((await stored(task)).total).toBe(5);
    });

    it('rejects an empty path, a path without formula, a broken formula and an unknown document', async () => {
      const task = await draft(schema, { name: 'Alice' });
      expect((await as()('post', `/documents/${task.documentId}/calc`).send({})).status).toBe(400);
      expect((await as()('post', `/documents/${task.documentId}/calc`).send({ path: 'name' })).status).toBe(400);
      expect((await as()('post', `/documents/${task.documentId}/calc`).send({ path: 'broken' })).status).toBeGreaterThanOrEqual(400);
      expect((await as()('post', `/documents/${MISSING}/calc`).send({ path: 'total' })).status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('external reader routes', () => {
    const store = new Map<string, string>();
    let previousRedis: any;

    beforeAll(() => {
      previousRedis = getRedisClient();
      const fakeRedis = {
        get: async (key: string) => store.get(key),
        set: async (key: string, value: any) => void store.set(key, JSON.stringify(value)),
        delete: async (key: string) => void store.delete(key),
      };
      setAppContext({ redisClient: fakeRedis });
    });

    afterAll(() => {
      setAppContext({ redisClient: previousRedis });
    });

    const schema = { properties: { name: { type: 'string' }, reader: { control: 'externalReaderCheck' } } };
    const body = { path: 'reader', service: 'svc', method: 'mth' };

    it('answers an error when the redis client is not available', async () => {
      const task = await draft({ properties: { name: { type: 'string' }, reader: { control: 'externalReaderCheck' } } });
      const redis = getRedisClient();
      setAppContext({ redisClient: undefined });
      const response = await as()('post', `/documents/${task.documentId}/external-reader/check/async`).send({
        path: 'reader',
        service: 'svc',
        method: 'mth',
      });
      setAppContext({ redisClient: redis });
      expect(response.status).toBe(500);
    });

    it('checks and saves reader data synchronously', async () => {
      const task = await draft(schema);
      const reader = jest.spyOn(document().externalReader, 'getDataByUser').mockResolvedValue({ data: { ok: 1 } } as any);
      const ok = await as()('post', `/documents/${task.documentId}/external-reader/check`).send(body);
      expect(ok.status).toBe(200);
      expect(reader).toHaveBeenCalled();
      expect((await stored(task)).reader).toEqual({ ok: 1 });
      reader.mockRejectedValueOnce(new Error('reader down'));
      expect((await as()('post', `/documents/${task.documentId}/external-reader/check`).send(body)).status).toBeGreaterThanOrEqual(400);
      await app.model('task').update({ draft_expired_at: new Date(Date.now() - 60000) }, { where: { id: task.id } });
      expect((await as()('post', `/documents/${task.documentId}/external-reader/check`).send(body)).status).toBeGreaterThanOrEqual(400);
    });

    it('runs the check asynchronously and reports the state by request id', async () => {
      const task = await draft(schema);
      jest.spyOn(document().externalReader, 'getDataByUser').mockResolvedValue({ data: { ok: 2 } } as any);
      const started = await as()('post', `/documents/${task.documentId}/external-reader/check/async`).send(body);
      expect(started.status).toBe(200);
      const requestId = started.body.data.requestId;
      await app.waitFor(async () => {
        const state = await as()('post', `/documents/${task.documentId}/external-reader/check/async`).send({ ...body, requestId });
        return state.body.data?.id === task.documentId;
      });
      expect((await stored(task)).reader).toEqual({ ok: 2 });
      expect((await as()('post', `/documents/${task.documentId}/external-reader/check/async`).send({ ...body, requestId: 'unknown' })).status).toBe(
        404,
      );
    });

    it('stores the failure of an asynchronous check', async () => {
      const task = await draft(schema);
      jest.spyOn(document().externalReader, 'getDataByUser').mockRejectedValue(new Error('Authentication error: denied'));
      const started = await as()('post', `/documents/${task.documentId}/external-reader/check/async`).send(body);
      const requestId = started.body.data.requestId;
      const failed = await app.waitFor(async () => {
        const state = await as()('post', `/documents/${task.documentId}/external-reader/check/async`).send({ ...body, requestId });
        return state.status === 401 ? state : undefined;
      });
      expect(failed.status).toBe(401);
      const expired = await draft(schema);
      await app.model('task').update({ draft_expired_at: new Date(Date.now() - 60000) }, { where: { id: expired.id } });
      expect((await as()('post', `/documents/${expired.documentId}/external-reader/check/async`).send(body)).status).toBeGreaterThanOrEqual(400);
    });
  });
});
