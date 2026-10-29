import nock from 'nock';

import { EventWorkflow } from '../src/services/event/workflow';
import { FileStorage } from '../src/lib/filestorage';
import { TestApp } from './test-app';

const WF = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('Group B - event workflow service', () => {
  let app: TestApp;
  let service: EventWorkflow;
  let originalExternal: any;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup({});
    service = new EventWorkflow();
    originalExternal = (global as any).config.external_bpmn;
  });
  afterAll(async () => {
    (global as any).config.external_bpmn = originalExternal;
    await TestApp.afterAll(app);
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    nock.cleanAll();
    await TestApp.afterEach(app);
  });
  beforeEach(async () => {
    await TestApp.beforeEach(app);
    (global as any).config.external_bpmn = {
      ext: { url: 'http://ext-bpmn.test', token: 'fake-token', queryParams: { a: '1' }, requestHeaders: { 'X-Test': 'y' } },
      noToken: { url: 'http://ext-bpmn.test' },
    };
    jest.spyOn(FileStorage.prototype, 'getFile').mockImplementation((async (id: string, p7s?: boolean) => ({
      id,
      name: `n-${id}`,
      contentType: 'text/plain',
      fileContent: p7s ? 'p7s-content' : 'content',
    })) as any);
  });

  describe('createWorkflows', () => {
    it('produces one message per workflow and loads files', async () => {
      const produce = jest.spyOn((global as any).messageQueue, 'produce').mockImplementation((() => undefined) as any);
      const res = await service.createWorkflows({
        workflowParentId: WF,
        createWorkflows: [{ initData: { a: 1 }, fileIds: ['f1'], filesMeta: [{ m: 1 }], p7sFileIds: ['p1'] }, { workflowTemplateId: 1 }],
      });
      expect(res.status).toBe(true);
      expect(res.workflowIds).toHaveLength(2);
      expect(produce).toHaveBeenCalledTimes(2);
      const first = produce.mock.calls[0][0] as any;
      expect(first.initData.files).toHaveLength(2);
      expect(first.workflowParentId).toBe(WF);
    });
  });

  describe('createWorkflowsExternal', () => {
    const schema = { workflowTemplateId: 5, taskTemplateId: 6, externalSystem: 'ext' };

    it('posts to the external system with files and signatures', async () => {
      const scope = nock('http://ext-bpmn.test')
        .post('/tasks/by-other-system')
        .query({ a: '1' })
        .matchHeader('authorization', 'fake-token')
        .reply(200, (_uri, body: any) => ({
          ok: true,
          wf: body.workflowTemplateId,
          files: body.initData.files.length,
          att: body.initData.attachmentsSignatures.length,
          sig: body.initData.signatures,
        }));
      jest.spyOn((global as any).models.documentSignature, 'findByDocumentId').mockResolvedValue([{ signature: JSON.stringify(['sig-1']) }] as any);
      const res = await service.createWorkflowsExternal({
        createWorkflowsExternal: [{ fileIds: ['f1'], p7sFileIds: ['p1'], attachmentsSignaturesIds: ['a1'], signaturesDocumentId: 'doc1', files: [] }],
        jsonSchemaObject: schema,
      });
      expect(res[0]).toEqual({ ok: true, wf: '5', files: 2, att: 1, sig: ['sig-1'] });
      expect(scope.isDone()).toBe(true);
    });

    it('fails when config is missing, signatures are missing or the request fails', async () => {
      await expect(
        service.createWorkflowsExternal({ createWorkflowsExternal: [{}], jsonSchemaObject: { externalSystem: 'unknown' } }),
      ).rejects.toMatchObject({
        message: expect.stringMatching(/not defined/),
        details: { jsonSchemaExternalSystem: 'unknown' },
      });
      await expect(
        service.createWorkflowsExternal({ createWorkflowsExternal: [{}], jsonSchemaObject: { externalSystem: 'noToken' } }),
      ).rejects.toThrow(/not defined/);

      jest.spyOn((global as any).models.documentSignature, 'findByDocumentId').mockResolvedValue([] as any);
      await expect(
        service.createWorkflowsExternal({ createWorkflowsExternal: [{ signaturesDocumentId: 'd' }], jsonSchemaObject: schema }),
      ).rejects.toThrow('Document signatures not found.');

      nock('http://ext-bpmn.test').post('/tasks/by-other-system').query(true).reply(500, 'bad');
      const err: any = await service.createWorkflowsExternal({ createWorkflowsExternal: [{}], jsonSchemaObject: schema }).catch((e) => e);
      expect(err.message).toBe('External system request error.');
      expect(err.details.requestOptions.headers).toBeUndefined();
    });
  });

  describe('sendStatusExternal', () => {
    const schema = { taskTemplateId: 7, externalSystem: 'ext' };

    it('posts the document with files', async () => {
      const scope = nock('http://ext-bpmn.test')
        .post(`/external_services/workflow/${WF}/task_template/7`)
        .query({ a: '1' })
        .reply(200, (_u, body: any) => ({ doc: body.document, files: body.files.length, att: body.attachmentsSignatures.length }));
      const res = await service.sendStatusExternal({
        sendStatusExternal: {
          workflowId: WF,
          data: { x: 1 },
          fileIds: ['f1'],
          filesMeta: [{}],
          p7sFileIds: ['p1'],
          attachmentsSignaturesIds: ['a1'],
        },
        jsonSchemaObject: schema,
      });
      expect(res).toEqual({ doc: { x: 1 }, files: 2, att: 1 });
      expect(scope.isDone()).toBe(true);
    });

    it('fails on missing config and request errors', async () => {
      await expect(
        service.sendStatusExternal({ sendStatusExternal: { workflowId: WF, externalSystem: 'noToken' }, jsonSchemaObject: schema }),
      ).rejects.toThrow('External system params not defined.');
      nock('http://ext-bpmn.test').post(/.*/).query(true).reply(500, 'bad');
      const err: any = await service.sendStatusExternal({ sendStatusExternal: { workflowId: WF }, jsonSchemaObject: schema }).catch((e) => e);
      expect(err.message).toBe('External system request error.');
    });
  });

  describe('sendStatus', () => {
    const g = () => (global as any).models;
    const happy = () => {
      const task = { id: 't1', taskTemplateId: '9', documentId: 'd1', isSystem: true, finished: false };
      jest.spyOn(g().workflow, 'findById').mockResolvedValue({ id: WF, workflowTemplateId: 1 });
      jest.spyOn(g().task, 'findByWorkflowIdAndTaskTemplateId').mockResolvedValue(task);
      jest.spyOn(g().document, 'findById').mockResolvedValue({ id: 'd1', isFinal: false });
      jest.spyOn(g().document, 'updateData').mockResolvedValue({ id: 'd1' });
      jest.spyOn(g().document, 'setStatusFinal').mockResolvedValue(undefined);
      jest.spyOn(g().task, 'setStatusFinished').mockResolvedValue({ id: 't1' });
      jest.spyOn(g().workflowTemplate, 'findByIdCached').mockResolvedValue({ id: 1, data: { statuses: [] } });
      jest.spyOn(g().task, 'getDocumentsByWorkflowId').mockResolvedValue([]);
      jest.spyOn(g().event, 'getEventsByWorkflowId').mockResolvedValue([]);
      jest.spyOn((global as any).messageQueue, 'produce').mockImplementation((() => undefined) as any);
      return task;
    };

    it('commits a single status and an array of statuses', async () => {
      happy();
      const one = await service.sendStatus({ sendStatus: { workflowId: WF, taskTemplateId: 9, data: { a: 1 } } });
      expect(one).toEqual({ id: 't1', document: { id: 'd1' } });
      const many = await service.sendStatus({
        sendStatus: [
          { workflowId: WF, taskTemplateId: 9, data: {} },
          { workflowId: WF, taskTemplateId: 9, data: {} },
        ],
      });
      expect(many).toHaveLength(2);
    });

    it('records a workflow error when setting the status fails', async () => {
      happy();
      jest.spyOn(g().workflowTemplate, 'findByIdCached').mockRejectedValue(new Error('tpl'));
      const create = jest.spyOn(g().workflowError, 'create').mockResolvedValue(undefined as any);
      await service.sendStatus({ sendStatus: { workflowId: WF, taskTemplateId: 9, data: {} } });
      expect(create).toHaveBeenCalled();
    });

    it.each([
      ['Workflow not found.', () => jest.spyOn(g().workflow, 'findById').mockResolvedValue(undefined)],
      ['Task not found.', () => jest.spyOn(g().task, 'findByWorkflowIdAndTaskTemplateId').mockResolvedValue(undefined)],
      [
        'The task is not the system.',
        () => jest.spyOn(g().task, 'findByWorkflowIdAndTaskTemplateId').mockResolvedValue({ id: 't', isSystem: false }),
      ],
      [
        'The task has already been committed.',
        () => jest.spyOn(g().task, 'findByWorkflowIdAndTaskTemplateId').mockResolvedValue({ id: 't', isSystem: true, finished: true }),
      ],
      ['Document not found.', () => jest.spyOn(g().document, 'findById').mockResolvedValue(undefined)],
      ['The document has already been committed.', () => jest.spyOn(g().document, 'findById').mockResolvedValue({ id: 'd', isFinal: true })],
      ['The document cannot be saved.', () => jest.spyOn(g().document, 'updateData').mockResolvedValue(undefined)],
      ['The task cannot be saved.', () => jest.spyOn(g().task, 'setStatusFinished').mockResolvedValue(undefined)],
    ])('rejects: %s', async (message, breakIt) => {
      happy();
      (breakIt as any)();
      await expect(service.sendStatus({ sendStatus: { workflowId: WF, taskTemplateId: 9, data: {} } })).rejects.toThrow(message as string);
    });
  });

  describe('setWorkflowStatus', () => {
    const tpl = (statuses: any) => ({ id: 1, data: { statuses } });
    let setStatus: jest.SpyInstance;
    beforeEach(() => {
      setStatus = jest.spyOn((global as any).models.workflow, 'setStatus').mockResolvedValue(undefined as any);
    });
    const run = (statuses: any, taskTemplateId = 1) => service.setWorkflowStatus(WF, tpl(statuses), taskTemplateId, { documents: [], events: [] });

    it('ignores templates without a matching status', async () => {
      await run(undefined);
      await run([{ taskTemplateId: 2, statusId: 1 }]);
      await run([{ taskTemplateId: 1 }]);
      expect(setStatus).not.toHaveBeenCalled();
    });

    it('sets a fixed status id', async () => {
      await run([{ taskTemplateId: 1, statusId: 2 }]);
      expect(setStatus).toHaveBeenCalledWith(WF, 2);
    });

    it.each([
      ['doing', 1],
      ['done', 2],
      ['Rejected', 3],
    ])('calculates %s status', async (type, id) => {
      const calc = `() => [{ type: '${type}', label: 'l', description: 'd', isStatusesTab: false, url: '{{frontUrl}}' }]`;
      await run([{ taskTemplateId: 1, calculate: calc }]);
      expect(setStatus).toHaveBeenCalledWith(WF, id, expect.any(Array));
    });

    it('replaces frontUrl and handles empty and invalid calculations', async () => {
      (global as any).config.notifier = { ...(global as any).config.notifier, email: { templateParams: { frontUrl: 'http://front.test' } } };
      await run([
        {
          taskTemplateId: 1,
          calculate:
            "() => [{ type: 'done', label: 'l', description: 'http://front.test', isStatusesTab: false }].filter(() => '{{frontUrl}}' === 'http://front.test')",
        },
      ]);
      expect(setStatus).toHaveBeenCalledTimes(1);
      await run([{ taskTemplateId: 1, calculate: '() => []' }]);
      await run([{ taskTemplateId: 1, calculate: '() => "x"' }]);
      expect(setStatus).toHaveBeenCalledTimes(1);
      await expect(run([{ taskTemplateId: 1, calculate: "() => [{ type: 'bad', label: 'l', description: 'd' }]" }])).rejects.toThrow(
        'Invalid status.',
      );
      await expect(
        run([{ taskTemplateId: 1, calculate: "() => [{ type: 'done', label: 'l', description: 'd', isStatusesTab: true }]" }]),
      ).rejects.toThrow('Non tabed');
    });
  });

  describe('setNewTasksPerformers', () => {
    const base = (over: any = {}) => ({
      taskIds: ['t1'],
      newPerformerUsers: ['u2'],
      newPerformerUserNames: ['User Two'],
      fromPerformerUsers: ['u1'],
      jsonSchemaObject: { allowedTaskTemplateIds: [5] },
      ...over,
    });

    it.each([
      ['taskIds', { taskIds: [] }],
      ['newPerformerUsers', { newPerformerUsers: undefined }],
      ['newPerformerUserNames', { newPerformerUserNames: [] }],
      ['fromPerformerUsers', { fromPerformerUsers: 'x' }],
      ['allowedTaskTemplateIds', { jsonSchemaObject: { allowedTaskTemplateIds: [] } }],
    ])('validates %s', async (name, over) => {
      await expect(service.setNewTasksPerformers(base(over))).rejects.toThrow(`Param ${name} is required`);
    });

    it('checks tasks and updates performers', async () => {
      const task = { id: 't1', performerUsers: ['u1'], taskTemplateId: 5, finished: false, deleted: false };
      const find = jest.spyOn(service.taskModel as any, 'findById').mockResolvedValue(task);
      const set = jest
        .spyOn(service.taskModel as any, 'setPerformerUsers')
        .mockResolvedValue({ ...task, workflowId: WF, performerUsers: ['u2'], performerUserNames: ['User Two'], meta: {} });
      const res = await service.setNewTasksPerformers(base());
      expect(res[0]).toMatchObject({ id: 't1', performerUsers: ['u2'] });
      expect(set).toHaveBeenCalledWith('t1', ['u2'], ['User Two']);

      find.mockResolvedValue({ ...task, performerUsers: ['other'] });
      await expect(service.setNewTasksPerformers(base())).rejects.toThrow(/fromPerformerUsers/);
      find.mockResolvedValue({ ...task, taskTemplateId: 6 });
      await expect(service.setNewTasksPerformers(base())).rejects.toThrow(/allowed taskTemplateId/);
      find.mockResolvedValue({ ...task, finished: true });
      await expect(service.setNewTasksPerformers(base())).rejects.toThrow(/not finished/);
    });
  });
});
