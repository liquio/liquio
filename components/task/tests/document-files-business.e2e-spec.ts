import { TestApp } from './test-app';
import { seedScenario, addTemplatePair, addUnit, userRequest, SCENARIO } from './helpers/scenario';

const USER = SCENARIO.userId;
const MISSING = '00000000-0000-4000-8000-000000000000';

// DocumentFilesBusiness against real tasks and documents: attachment lookup and deletion, files to preview with
// signature info, system task attachments and the pdf queue; the storage provider is replaced by spies.
describe('Document files business', () => {
  let app: TestApp;
  let nextId = 990400;
  const units = { all: [990021], head: [990021], member: [990021] };
  const as = (userId = USER) => userRequest(app, userId);
  const files = () => (global as any).businesses.document.files;
  const provider = () => files().host.storageService.provider;

  const draft = async (taskSchema: any = {}, documentSchema: any = {}) => {
    const id = nextId++;
    await addTemplatePair(app, id, taskSchema, { required: [], ...documentSchema });
    const created = await as()('post', '/tasks').send({ workflowTemplateId: SCENARIO.workflowTemplateId, taskTemplateId: id });
    expect(created.status).toBe(200);
    return created.body.data;
  };
  const attach = (documentId: string, link: string, extra: any = {}) =>
    app.model('documentAttachment').create({
      document_id: documentId,
      link,
      name: `${link}.txt`,
      type: 'text/plain',
      size: 3,
      labels: [],
      is_generated: false,
      is_system: false,
      meta: {},
      ...extra,
    });

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await seedScenario(app);
    await addUnit(app, { id: 990021, name: 'Files unit', heads: [USER], members: [USER], heads_ipn: [], members_ipn: [] });
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

  describe('attachments', () => {
    it('finds attachment info and links and checks the owning document', async () => {
      const task = await draft();
      const other = await draft();
      const attachment = await attach(task.documentId, 'file-a');
      expect((await files().getAttachmentInfo(attachment.id)).link).toBe('file-a');
      await expect(files().getAttachmentInfo(MISSING)).rejects.toThrow('Attachment not found');
      expect(await files().getAttachmentFileLink(task.documentId, attachment.id)).toBe('file-a');
      expect(await files().getAttachmentFileLink(task.documentId, attachment.id, true)).toEqual({ fileLink: 'file-a', fileName: 'file-a.txt' });
      await expect(files().getAttachmentFileLink(other.documentId, attachment.id)).rejects.toThrow();
      const empty = await attach(task.documentId, '');
      await expect(files().getAttachmentFileLink(task.documentId, empty.id)).rejects.toThrow();
      expect(await files().getAttachmentFilesLinks(task.documentId)).toEqual(expect.arrayContaining(['file-a']));
    });

    it('downloads and deletes an attachment', async () => {
      const task = await draft();
      const attachment = await attach(task.documentId, 'file-b');
      const download = jest.spyOn(provider(), 'downloadFile').mockResolvedValue('stream' as any);
      expect(await files().getAttachment(task.documentId, attachment.id, USER)).toBe('stream');
      expect(download).toHaveBeenCalledTimes(1);
      const deleted = await files().deleteAttachment(task.documentId, attachment.id, USER);
      expect(deleted).toEqual({ fileLink: 'file-b', fileName: 'file-b.txt' });
      await expect(files().deleteAttachment(task.documentId, attachment.id, USER)).rejects.toThrow('Attachment not found');
    });
  });

  describe('files to preview', () => {
    const previewSchema = (control: any = {}) => ({ properties: { preview: { control: 'preview.document', ...control } } });

    it('rejects a path that is not a preview control and answers empty without templates', async () => {
      const task = await draft({}, previewSchema());
      const templateId = task.document.documentTemplateId;
      await expect(files().getFilesToPreview(task.workflowId, templateId, 'unknown')).rejects.toThrow('Schema control not found');
      await expect(files().getFilesToPreview(task.workflowId, templateId, 'preview', undefined, true)).rejects.toThrow('Schema control not found');
      expect(await files().getFilesToPreview(task.workflowId, templateId, 'preview')).toEqual([]);
    });

    it('lists main files and attachments of the workflow with download tokens', async () => {
      const task = await draft({}, previewSchema({ documentTemplateIds: [nextId] }));
      const templateId = task.document.documentTemplateId;
      await app
        .model('document')
        .update(
          { file_id: 'main-file', file_name: 'main.pdf', file_type: 'application/pdf', file_size: 5, is_final: true },
          { where: { id: task.documentId } },
        );
      await attach(task.documentId, 'file-c', { labels: ['x'] });
      await app.model('task').update({ finished: true }, { where: { id: task.id } });
      const list = await files().getFilesToPreview(task.workflowId, templateId, 'preview', { finished: true, updatedAt: new Date() }, false, true);
      expect(list.map((v) => v.fileLink)).toEqual(expect.arrayContaining(['main-file', 'file-c']));
      expect(list.every((v) => typeof v.downloadToken === 'string')).toBe(true);
    });

    it('lists the direct document files, applies filters and custom attachment functions', async () => {
      const direct = { control: 'preview.document.direct', includeMainFile: true };
      const task = await draft(
        {},
        { properties: { preview: { ...direct, documentTemplateId: 990600 + 1000, filter: '(f) => f.fileLink !== "skip"' } } },
      );
      const templateId = task.document.documentTemplateId;
      await attach(task.documentId, 'skip');
      await attach(task.documentId, 'keep');
      expect(await files().getFilesToPreview(task.workflowId, templateId, 'preview', undefined, true)).toEqual([]);

      const own = await draft(
        {},
        {
          properties: {
            preview: { ...direct, documentTemplateId: 0, documentAttaches: '(doc) => doc.attachments', filter: '(f) => f.fileLink !== "skip"' },
          },
        },
      );
      await attach(own.documentId, 'skip');
      await attach(own.documentId, 'keep');
      await app.model('task').update({ finished: true }, { where: { id: own.id } });
      jest
        .spyOn((global as any).models.task, 'findDocumentByWorkflowIdAndTaskTemplateIds')
        .mockResolvedValue({ document: { id: own.documentId } } as any);
      const list = await files().getFilesToPreview(own.workflowId, own.document.documentTemplateId, 'preview', undefined, true);
      expect(list.map((v) => v.fileLink)).toEqual(['keep']);
      jest.spyOn((global as any).models.task, 'findDocumentByWorkflowIdAndTaskTemplateIds').mockResolvedValue({} as any);
      expect(await files().getFilesToPreview(own.workflowId, own.document.documentTemplateId, 'preview', undefined, true)).toEqual([]);
    });

    it('adds signature info and the p7s flag with access check', async () => {
      const task = await draft({}, previewSchema({ documentTemplateIds: [nextId] }));
      await app
        .model('document')
        .update(
          { file_id: 'signed-file', file_name: 'signed.pdf', file_type: 'application/pdf', file_size: 5, is_final: true },
          { where: { id: task.documentId } },
        );
      await app.model('task').update({ finished: true }, { where: { id: task.id } });
      await app.model('documentSignature').create({
        document_id: task.documentId,
        created_by: USER,
        certificate: 'fake-certificate',
        signature: JSON.stringify(['sig-a', 'sig-b']),
        created_at: new Date(),
        updated_at: new Date(),
      });
      const info = jest
        .spyOn(files().host.eds, 'getSignatureInfo')
        .mockImplementation(async (signature: any) => ({ serial: signature === 'sig-b' ? 'two' : 'one', content: 'x' }) as any);
      const metadata = jest.spyOn(provider(), 'getP7sMetadata').mockResolvedValue([{ file_id: 'signed-file' }] as any);
      const withP7s = await files().getFilesToPreviewAndCheckAccess(task.documentId, 'preview', USER, units);
      const signed = withP7s.find((v) => v.fileLink === 'signed-file');
      expect(signed.hasP7sSignature).toBe(true);
      expect(signed.signatures.length).toBeGreaterThan(0);
      metadata.mockResolvedValue([]);
      info.mockRejectedValueOnce(new Error('bad signature'));
      const withoutP7s = await files().getFilesToPreviewAndCheckAccess(task.documentId, 'preview', USER, units);
      expect(withoutP7s.find((v) => v.fileLink === 'signed-file').hasP7sSignature).toBe(false);
      await expect(files().getFilesToPreviewAndCheckAccess(MISSING, 'preview', USER, units)).rejects.toThrow();
    });
  });

  describe('system task attachments and generated pdf', () => {
    it('uploads files, creates attachments and saves them to the document data', async () => {
      const task = await draft();
      const upload = jest
        .spyOn(provider(), 'uploadFileFromStream')
        .mockResolvedValue({ id: 'uploaded', name: 'u.txt', contentType: 'text/plain', contentLength: 2 } as any);
      await files().createAttachmentsForSystemTask(
        [{ name: 'u.txt', contentType: 'text/plain', fileContent: Buffer.from('hi').toString('base64'), meta: { m: 1 } }],
        task.documentId,
        USER,
        units,
      );
      expect(upload).toHaveBeenCalled();
      expect(await app.model('documentAttachment').count({ where: { document_id: task.documentId, link: 'uploaded' } })).toBe(1);
      upload.mockRejectedValueOnce(new Error('storage down'));
      await expect(
        files().createAttachmentsForSystemTask([{ name: 'bad.txt', contentType: 'text/plain', fileContent: 'aGk=' }], task.documentId, USER, units),
      ).rejects.toThrow('bad.txt upload error');
    });

    it('saves attachment info by path and detects array paths', async () => {
      const task = await draft();
      const document = await (global as any).models.document.findById(task.documentId);
      await files().saveAttachmentToDocumentData({ id: 'a1', isAttachmentPlaceholder: true }, undefined, document, USER, units);
      await files().saveAttachmentToDocumentData({ id: 'a1', meta: { k: 1 } }, 'note', document, USER, units, true);
      expect(files().isDocumentPathToArray('files.0')).toBe(true);
      expect(files().isDocumentPathToArray('files.name')).toBe(false);
      expect(files().isDocumentPathToArray(5 as any)).toBeUndefined();
    });

    it('queues pdf generation once and stores an external pdf', async () => {
      const task = await draft();
      const document = await (global as any).models.document.findById(task.documentId);
      const produce = jest.spyOn((global as any).messageQueue, 'produce').mockResolvedValue(undefined as any);
      await files().addGeneratingPdfToQueue(document, USER);
      expect(produce).toHaveBeenCalledTimes(1);
      expect((await app.model('document').findByPk(task.documentId)).file_id).toBe('generating');
      await files().addGeneratingPdfToQueue({ ...document, fileId: 'generating' }, USER);
      expect(produce).toHaveBeenCalled();

      jest.spyOn(provider(), 'uploadFileFromStream').mockResolvedValue({ id: 'ext-pdf', name: 'ext.pdf', contentType: 'application/pdf' } as any);
      await files().saveExternalPdf(
        { name: 'ext.pdf', contentType: 'application/pdf', fileContent: Buffer.from('%PDF').toString('base64') },
        task.documentId,
        USER,
      );
      expect((await app.model('document').findByPk(task.documentId)).file_id).toBe('ext-pdf');
    });
  });
});
