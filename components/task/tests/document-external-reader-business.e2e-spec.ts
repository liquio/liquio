import { TestApp } from './test-app';
import { seedScenario, addTemplatePair, addUnit, userRequest, SCENARIO } from './helpers/scenario';

const USER = SCENARIO.userId;
const SERVICE = 'readerService';
const METHOD = 'readerMethod';
const MISSING = '00000000-0000-4000-8000-000000000000';

// DocumentBusiness.checkAndSaveDataFromExternalReader against real documents: filters, timeouts,
// attachments options, response decorator, onRequest and onResponse handlers; the reader itself is a spy.
describe('Document external reader business', () => {
  let app: TestApp;
  let nextId = 990450;
  const units = { all: [], head: [], member: [] };
  const as = (userId = USER) => userRequest(app, userId);
  const document = () => (global as any).businesses.document;
  let reader: jest.SpyInstance;
  const lastCall = (): any[] => reader.mock.calls[reader.mock.calls.length - 1];

  const draft = async (control: any = {}, extraProperties: any = {}, documentData?: any) => {
    const id = nextId++;
    await addTemplatePair(
      app,
      id,
      {},
      {
        required: [],
        properties: { name: { type: 'string' }, reader: { control: 'externalReaderCheck', ...control }, ...extraProperties },
      },
    );
    const created = await as()('post', '/tasks').send({ workflowTemplateId: SCENARIO.workflowTemplateId, taskTemplateId: id });
    expect(created.status).toBe(200);
    if (documentData) {
      await app.model('document').update({ data: documentData }, { where: { id: created.body.data.documentId } });
    }
    return created.body.data;
  };
  const run = (task: any, extra: any = {}) =>
    document().checkAndSaveDataFromExternalReader({
      service: SERVICE,
      method: METHOD,
      documentId: task.documentId,
      path: 'reader',
      userId: USER,
      userUnitIds: units,
      ...extra,
    });
  const stored = async (task: any) => (await app.model('document').findByPk(task.documentId)).data;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await seedScenario(app);
    await addUnit(app, { id: 990051, name: 'Reader unit', heads: [], members: [USER], heads_ipn: [], members_ipn: [] });
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
    reader = jest.spyOn(document().externalReader, 'getDataByUser').mockResolvedValue({ data: { found: true } } as any);
  });

  it('saves the reader response into the document', async () => {
    const task = await draft();
    const updated = await run(task);
    expect(updated.id).toBe(task.documentId);
    expect((await stored(task)).reader).toEqual({ found: true });
  });

  it('rejects a missing, final or invalid target', async () => {
    const task = await draft();
    await expect(run({ documentId: MISSING })).rejects.toThrow();
    await expect(run(task, { path: 'unknown' })).rejects.toThrow('Can not find external reader check property');
    await expect(run(task, { path: 'name' })).rejects.toThrow('control externalReaderCheck');
    await app.model('document').update({ is_final: true }, { where: { id: task.documentId } });
    await expect(run(task)).rejects.toThrow('committed');
  });

  it('builds filters from literals, document paths and functions and saves them', async () => {
    const task = await draft(
      { filters: { literal: '#value', fromPath: 'name', fromFunction: '(data) => data.document.name + "!"', raw: 5 }, filtersPath: 'readerFilters' },
      { readerFilters: { type: 'object' } },
      { name: 'Alice' },
    );
    await run(task);
    const filter = lastCall()[5];
    expect(filter).toEqual({ literal: 'value', fromPath: 'Alice', fromFunction: 'Alice!', raw: 5 });
    expect((await stored(task)).readerFilters).toEqual(filter);
  });

  it('requires filtersPath for function filters', async () => {
    const task = await draft({ filters: { a: '(data) => 1' } });
    await expect(run(task)).rejects.toThrow('filtersPath');
  });

  it('applies index templates to paths and filters', async () => {
    const task = await draft(
      { filters: { item: 'list.${index}.a' }, filtersPath: 'readerFilters.${index}' },
      { list: { type: 'array' }, readerFilters: { type: 'array' } },
      { list: [{ a: 'zero' }, { a: 'one' }] },
    );
    await run(task, { index: 1, path: 'reader' });
    expect(lastCall()[5].item).toBe('one');
    await run(task, { index: [0], path: 'reader' });
    expect(reader).toHaveBeenCalledTimes(2);
  });

  it('passes timeouts and attachment options to the reader', async () => {
    const task = await draft({
      timeoutInSeconds: '3',
      requestTimeout: 1000,
      isSaveAttachments: '(document) => true',
      isRewriteAttachmentsOnEachRequest: true,
      deleteOldAttachmentsBeforeSave: true,
      prepareAttachments: { x: 1 },
    });
    await run(task);
    const [, , , , , filter, extra, , , , timeout] = lastCall();
    expect(filter.customTimeout).toBe(3000);
    expect(timeout).toBe(3000);
    expect(extra).toMatchObject({
      requestTimeout: 1000,
      isSaveAttachments: true,
      isRewriteAttachmentsOnEachRequest: true,
      prepareAttachments: { x: 1 },
    });
    const again = await draft({ isSaveAttachments: true, isRewriteAttachmentsOnEachRequest: '(document) => false' });
    await run(again);
    expect(lastCall()[6]).toMatchObject({ isSaveAttachments: true, isRewriteAttachmentsOnEachRequest: false });
  });

  it('reports broken attachment option functions', async () => {
    const save = await draft({ isSaveAttachments: '() => { throw new Error("x"); }' });
    await expect(run(save)).rejects.toThrow('isSaveAttachments');
    const rewrite = await draft({ isRewriteAttachmentsOnEachRequest: '() => { throw new Error("x"); }' });
    await expect(run(rewrite)).rejects.toThrow('isRewriteAttachmentsOnEachRequest');
  });

  it('decorates the response and fails on an empty reader answer', async () => {
    const task = await draft({ responseDecorator: '(data) => data.found' });
    await run(task);
    expect((await stored(task)).reader).toEqual({ decorated: true, raw: { found: true } });
    reader.mockResolvedValueOnce(undefined as any);
    await expect(run(task)).rejects.toThrow("Can't get external reader check data");
  });

  describe('onRequest', () => {
    it('removes the previous response by flag or function', async () => {
      const task = await draft({ onRequest: { isRemovePreviousResponse: true } }, {}, { reader: { old: true } });
      reader.mockImplementationOnce(async () => {
        expect((await stored(task)).reader).toBeUndefined();
        return { data: { fresh: true } } as any;
      });
      await run(task);
      expect((await stored(task)).reader).toEqual({ fresh: true });
      const byFunction = await draft({ onRequest: { isRemovePreviousResponse: '(document) => true' } }, {}, { reader: { old: true } });
      await run(byFunction);
      const invalid = await draft({ onRequest: { isRemovePreviousResponse: '(document) => "yes"' } });
      await expect(run(invalid)).rejects.toThrow('should be type of');
    });

    it('removes previous attachments of the reader', async () => {
      const task = await draft({ onRequest: { isRemovePreviousAttachments: true } });
      await app.model('documentAttachment').create({
        document_id: task.documentId,
        link: 'old-file',
        name: 'old.txt',
        type: 'text/plain',
        size: 1,
        labels: [],
        is_generated: false,
        is_system: false,
        meta: { fromExternalReader: `${SERVICE}.${METHOD}` },
      });
      const deleteFile = jest.spyOn(document().storageService.provider, 'deleteFile').mockRejectedValueOnce(new Error('storage down'));
      await run(task);
      expect(deleteFile).toHaveBeenCalledWith('old-file');
      expect(await app.model('documentAttachment').count({ where: { document_id: task.documentId } })).toBe(0);
    });
  });

  describe('onResponse', () => {
    it('adds a member to a unit when the schema function allows it', async () => {
      const addMember = jest.spyOn(document().unitModel, 'addMember').mockResolvedValue(undefined as any);
      const task = await draft({
        onResponse: {
          addMemberToUnitByUserId: { isExecute: '(ctx) => ctx.response.found === true', userId: '() => "new-member"', unitId: '() => 990051' },
        },
      });
      await run(task);
      expect(addMember).toHaveBeenCalledWith(990051, 'new-member');
    });

    it('rejects broken addMemberToUnitByUserId functions', async () => {
      const broken = (patch: any) => ({ isExecute: '() => true', userId: '() => "u"', unitId: '() => 1', ...patch });
      for (const [patch, message] of [
        [{ isExecute: '() => { throw new Error("x"); }' }, 'isExecute schema function throw error'],
        [{ userId: '() => { throw new Error("x"); }' }, 'userId schema function throw error'],
        [{ unitId: '() => { throw new Error("x"); }' }, 'unit schema function throw error'],
        [{ isExecute: '() => "yes"' }, 'must return boolean'],
      ] as any[]) {
        const task = await draft({ onResponse: { addMemberToUnitByUserId: broken(patch) } });
        await expect(run(task)).rejects.toThrow(message);
      }
    });

    it('starts the delayed auto commit timer for a configured queue only', async () => {
      const config = (global as any).config;
      config.message_queue = { ...config.message_queue, delayedAutoCommitQueues: { fast: {} } };
      const produce = jest.spyOn((global as any).messageQueue, 'produce').mockResolvedValue(undefined as any);
      const task = await draft({ onResponse: { startAutoCommitTimer: { isExecute: '() => true', timer: '() => "fast"' } } });
      await run(task);
      expect(produce).toHaveBeenCalledWith({ taskId: task.id }, 'delayedAutoCommit', expect.stringContaining('delayed-auto-commit-fast'));
      const unknown = await draft({ onResponse: { startAutoCommitTimer: { isExecute: '() => true', timer: '() => "slow"' } } });
      await expect(run(unknown)).rejects.toThrow('Invalid');
      const skipped = await draft({ onResponse: { startAutoCommitTimer: { isExecute: '() => false', timer: '() => "slow"' } } });
      await run(skipped);
      const throwing = await draft({ onResponse: { startAutoCommitTimer: { isExecute: '() => { throw new Error("x"); }', timer: '() => "fast"' } } });
      await expect(run(throwing)).rejects.toThrow('startAutoCommitTimer schema function throw error');
    });
  });
});
