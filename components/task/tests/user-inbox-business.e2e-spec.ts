import { TestApp } from './test-app';
import { seedScenario, addTemplatePair, userRequest, SCENARIO } from './helpers/scenario';

const CREATOR = SCENARIO.userId;
const OTHER = 'inbox-other-user';

// Inbox business and controller: documents of finished tasks are sent to the inboxes of the workflow creator
// and of users calculated by the template, and the user reads, counts and marks them over HTTP.
describe('User inbox', () => {
  let app: TestApp;
  let nextId = 990470;
  const as = (userId = CREATOR) => userRequest(app, userId);
  const inboxBusiness = () => (global as any).businesses.userInbox;

  const finishedTask = async (inboxes: any, fileId: string | null = 'inbox-file') => {
    const id = nextId++;
    await addTemplatePair(app, id, {}, { required: [], fileName: '() => "Calculated name"' });
    await app.model('documentTemplate').update({ access_json_schema: { inboxes, workflowFiles: {} } }, { where: { id } });
    const created = await as()('post', '/tasks').send({ workflowTemplateId: SCENARIO.workflowTemplateId, taskTemplateId: id });
    expect(created.status).toBe(200);
    const task = created.body.data;
    await app
      .model('document')
      .update({ file_id: fileId, file_name: 'doc.pdf', file_type: 'application/pdf', number: 'N-1' }, { where: { id: task.documentId } });
    return { ...task, finished: true };
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await seedScenario(app);
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

  describe('sending to inboxes', () => {
    it('creates inbox records for the workflow creator and the calculated users', async () => {
      const task = await finishedTask({ workflowCreator: true, users: `() => ["${OTHER}", "${OTHER}"]` });
      await inboxBusiness().sendToInboxesIfNeedIt(task);
      await app.waitFor(async () => (await app.model('userInbox').count({ where: { document_id: task.documentId } })) === 2);
      const rows = await app.model('userInbox').findAll({ where: { document_id: task.documentId } });
      expect(rows.map((v) => v.user_id).sort()).toEqual([CREATOR, OTHER].sort());
      expect(rows[0].name).toBe('Calculated name');
    });

    it('accepts a single user string, ignores broken functions and skips unsuitable tasks', async () => {
      const single = await finishedTask({ users: `() => "${OTHER}"` });
      await inboxBusiness().sendToInboxesIfNeedIt(single);
      await app.waitFor(async () => (await app.model('userInbox').count({ where: { document_id: single.documentId } })) === 1);
      const broken = await finishedTask({ users: '() => { throw new Error("x"); }' });
      await inboxBusiness().sendToInboxesIfNeedIt(broken);
      const noFile = await finishedTask({ workflowCreator: true }, null);
      await inboxBusiness().sendToInboxesIfNeedIt(noFile);
      await inboxBusiness().sendToInboxesIfNeedIt({ ...single, finished: false });
      await inboxBusiness().sendToInboxesIfNeedIt({ ...single, documentId: undefined });
      await inboxBusiness().sendToInboxesIfNeedIt({ ...single, documentId: '00000000-0000-4000-8000-000000000000' });
      await inboxBusiness().sendToInboxesIfNeedIt(undefined);
      expect(await app.model('userInbox').count({ where: { document_id: [broken.documentId, noFile.documentId] } })).toBe(0);
    });
  });

  describe('HTTP', () => {
    it('lists inboxes with calculated file info and caches it in the meta', async () => {
      const task = await finishedTask({ workflowCreator: true });
      await inboxBusiness().sendToInboxesIfNeedIt(task);
      await app.waitFor(async () => (await app.model('userInbox').count({ where: { document_id: task.documentId } })) === 1);
      await app.model('documentAttachment').create({
        document_id: task.documentId,
        link: 'generated-link',
        name: 'g.pdf',
        type: 'application/pdf',
        size: 1,
        labels: [],
        is_generated: true,
        is_system: false,
        meta: {},
      });
      await app.model('documentSignature').create({
        document_id: task.documentId,
        signature: JSON.stringify(['sig']),
        certificate: 'fake-certificate',
        created_by: CREATOR,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const storage = (global as any).businesses.document.files.host.storageService.provider;
      jest.spyOn(storage, 'getP7sMetadata').mockResolvedValue([{ file_id: 'inbox-file' }] as any);
      jest.spyOn((global as any).businesses.task.eds, 'getSignatureInfo').mockResolvedValue({ signer: 'S' } as any);
      const first = await as()('get', '/user-inboxes').query({ page: 1, count: 10 });
      expect(first.status).toBe(200);
      expect(first.body.data[0]).toMatchObject({ fileType: 'application/pdf', hasP7sSignature: true });
      expect(first.body.data[0].generatedAttachments[0].downloadToken).toBeTruthy();
      await app.waitFor(async () => (await app.model('userInbox').findOne({ where: { document_id: task.documentId } })).meta.fileId === 'inbox-file');
      const second = await as()('get', '/user-inboxes').query({ page: 1, count: 10 });
      expect(second.status).toBe(200);
      expect(second.body.data[0].fileType).toBe('application/pdf');
    });

    it('counts unread inboxes and marks them as read for the owner only', async () => {
      const task = await finishedTask({ workflowCreator: true });
      await inboxBusiness().sendToInboxesIfNeedIt(task);
      await app.waitFor(async () => (await app.model('userInbox').count({ where: { document_id: task.documentId } })) === 1);
      const row = await app.model('userInbox').findOne({ where: { document_id: task.documentId } });
      const unread = await as()('get', '/user-inboxes/unread/count');
      expect(unread.status).toBe(200);
      expect((await as(OTHER)('put', `/user-inboxes/${row.id}/is-read`)).status).toBe(403);
      expect((await as()('put', '/user-inboxes/00000000-0000-4000-8000-000000000000/is-read')).status).toBe(404);
      expect((await as()('put', `/user-inboxes/${row.id}/is-read`)).status).toBe(200);
      expect((await app.model('userInbox').findByPk(row.id)).is_read).toBe(true);
    });
  });
});
