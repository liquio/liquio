import { WorkflowHistoryModel } from '../src/models/workflow_history';
import { TestApp } from './test-app';

const WF = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const TASK = 'b1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const TASK2 = 'c1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const DOC = 'd1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const MISSING = 'e1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('Group B - task, document, workflow, workflow history and raw query models', () => {
  let app: TestApp;
  let models: any;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup({});
    models = (app as any).models.models;
  });
  afterAll(async () => {
    await TestApp.afterAll(app);
  });
  afterEach(async () => {
    await TestApp.afterEach(app);
  });
  beforeEach(async () => {
    await TestApp.beforeEach(app);
  });

  async function fixtures(withTasks = false) {
    await app.model('task').destroy({ where: { workflow_id: WF } });
    await app
      .model('workflowTemplate')
      .upsert({ id: 720001, name: 'T', description: 'd', xml_bpmn_schema: '<x/>', data: {}, is_active: true, errors_subscribers: [] });
    await app.model('workflow').upsert({
      id: WF,
      workflow_template_id: 720001,
      name: 'W',
      is_final: false,
      created_by: 'u',
      updated_by: 'u',
      data: {},
      workflow_status_id: 1,
      user_data: {},
      has_unresolved_errors: false,
      statuses: {},
    });
    await app.model('documentTemplate').upsert({ id: 720001, name: 'D', json_schema: '{}', html_template: '' });
    await app.model('taskTemplate').upsert({ id: 720001, name: 'TT', document_template_id: 720001, json_schema: '{}', html_template: '' });
    await app.model('document').upsert({
      id: DOC,
      document_template_id: 720001,
      document_state_id: 1,
      owner_id: 1,
      created_by: 'u',
      updated_by: 'u',
      number: '1',
      is_final: false,
      file_id: 'f',
      file_name: 'n',
      file_type: 't',
      data: {},
      external_id: null,
    });
    const document = { id: DOC };
    const mk = (id: string, extra: any = {}) =>
      app.model('task').upsert({
        id,
        workflow_id: WF,
        task_template_id: 720001,
        document_id: document.id,
        name: 'task',
        description: 'd',
        performer_users: ['pu1', 'pu2'],
        performer_units: [10],
        performer_usernames: ['a', 'b'],
        created_by: 'u',
        updated_by: 'u',
        data: {},
        meta: {},
        finished: false,
        deleted: false,
        is_current: true,
        ...extra,
      });
    if (withTasks) {
      await mk(TASK);
      await mk(TASK2, { performer_users: ['pu3'] });
    }
    return document;
  }

  it('TaskModel queries and updates', async () => {
    const doc = await fixtures(true);
    const t = models.task;
    const found = await t.findById(TASK);
    expect(found.id).toBe(TASK);
    expect(await t.findById(MISSING)).toBeUndefined();

    const docs = await t.getDocumentsByWorkflowId(WF);
    expect(docs[0].task.id).toBeDefined();
    expect((await t.getDocumentsByWorkflowId(WF, false)).length).toBeGreaterThan(0);
    expect(await t.getTasksInProgress(WF)).toHaveLength(2);
    expect(await t.getTasksByWorkflowId(WF)).toHaveLength(2);
    expect((await t.findByWorkflowIdAndTaskTemplateId(WF, 720001)).id).toBeDefined();
    expect(await t.findByWorkflowIdAndTaskTemplateId(WF, 1)).toBeUndefined();

    const removed = await t.removePerformerUserFromTasks('pu1', 10);
    expect(removed[0].performerUsers).not.toContain('pu1');
    expect(await t.removePerformerUserFromTasks('nobody', 10)).toBeUndefined();
    const removedList = await t.removePerformerUserListFromTasks(['pu2', 'pu3'], 10);
    expect(removedList).toHaveLength(2);
    expect(await t.removePerformerUserListFromTasks(['nobody'], 10)).toBeUndefined();

    const set = await t.setPerformerUsers(TASK, ['n1'], ['N1']);
    expect(set.performerUsers).toEqual(['n1']);
    expect(await t.setPerformerUsers(MISSING, ['n1'], ['N1'])).toBeUndefined();
    const upd = await t.update(TASK, { name: 'renamed', meta: { a: 1 }, data: { b: 2 } });
    expect(upd.name).toBe('renamed');
    await t.update(MISSING, { name: 'x' }).catch(() => null);
    expect(await t.setStatusFinished(TASK)).toBeDefined();
    await t.setStatusFinished(MISSING).catch(() => null);
    await t.setCancelled(TASK2);
    expect((await t.findById(TASK2)).finished).toBe(true);
    expect(doc.id).toBeDefined();
  });

  it('DocumentModel operations', async () => {
    const d = models.document;
    const doc = await fixtures();
    expect((await d.findById(doc.id)).id).toBe(doc.id);
    await expect(d.findById(MISSING)).resolves.toBeUndefined();
    await d.setExternalId(doc.id, 'ext-1');
    expect((await d.findById(doc.id)).externalId).toBe('ext-1');
    expect((await d.updateData(doc.id, { k: 'v' })).data).toEqual({ k: 'v' });
    expect(await d.updateData(MISSING, {})).toBeUndefined();
    await d.setStatusFinal(doc.id);
    expect((await d.findById(doc.id)).isFinal).toBe(true);
    await d.clearFileData(doc.id);
    expect((await d.findById(doc.id)).fileId).toBeNull();
    await d.setCancelled(doc.id);
    const child = await d.create({ parentId: doc.id, documentTemplateId: 720001, userId: 'u' }).catch(() => ({ isFinal: true }));
    expect(child.isFinal).toBe(true);
  });

  it('WorkflowModel, WorkflowHistoryModel and RawQueryModel', async () => {
    await fixtures();
    const w = models.workflow;
    expect((await w.findById(WF)).id).toBe(WF);
    await expect(w.findById(MISSING)).resolves.toBeUndefined();
    await w.setStatus(WF, 2, [{ type: 'done' }]);
    expect((await w.findById(WF)).workflowStatusId).toBe(2);
    await w.setError(WF);
    expect((await w.findById(WF)).hasUnresolvedErrors).toBe(true);

    const h = new WorkflowHistoryModel();
    expect(await h.findLastVersionByWorkflowTemplateId(720001)).toBeUndefined();
    await h.model.create({
      workflow_template_id: 720001,
      user_id: 'u',
      data: '{}',
      version: '1',
      is_current_version: true,
      meta: {},
      name: 'n',
      description: 'd',
    });
    expect((await h.findLastVersionByWorkflowTemplateId(720001)).version).toBe('1');

    const rq = models.rawQueryModel;
    await rq.createSequence('test_seq_b');
    expect(Number(await rq.getNextvalOfSequence('test_seq_b'))).toBe(1);
    await expect(rq.getNextvalOfSequence('missing_seq_b')).rejects.toHaveProperty('details');
    await expect(rq.createSequence('bad name;')).rejects.toHaveProperty('details');
  });
});
