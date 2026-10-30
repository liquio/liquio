import { TestApp } from './test-app';
import { seedScenario, addTemplatePair, addUnit, userRequest, SCENARIO } from './helpers/scenario';
import { getBusinesses, getConfig, getModels } from '../src/lib/context';

const USER = SCENARIO.userId;
const IPN = '1234567890';

// TaskBusiness methods that HTTP routes reach only indirectly: attachment copy, signers, performers,
// due date, notifications, access checks and small helpers, run against real tasks and documents.
describe('Task business methods', () => {
  let app: TestApp;
  let nextId = 990300;
  const units = { all: [990011], head: [990011], member: [990011] };
  const as = (userId = USER) => userRequest(app, userId);
  const biz = () => (getBusinesses() as any).task;
  const models = () => getModels();

  const draft = async (taskSchema: any = {}, documentSchema: any = {}) => {
    const id = nextId++;
    await addTemplatePair(app, id, taskSchema, { required: [], ...documentSchema });
    const created = await as()('post', '/tasks').send({ workflowTemplateId: SCENARIO.workflowTemplateId, taskTemplateId: id });
    expect(created.status).toBe(200);
    return created.body.data;
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await seedScenario(app);
    await addUnit(app, { id: 990011, name: 'Methods unit', heads: [USER], members: [USER, 'method-member'], heads_ipn: [], members_ipn: [] });
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

  describe('copying document files', () => {
    const attach = (documentId: string, link: string, isGenerated = false) =>
      app.model('documentAttachment').create({
        document_id: documentId,
        link,
        name: `${link}.txt`,
        type: 'text/plain',
        size: 3,
        labels: [],
        is_generated: isGenerated,
        is_system: false,
        meta: {},
      });

    it('copies the pdf reference with and without signatures and as an attachment', async () => {
      const a = await draft();
      const b = await draft();
      await models().document.addDocumentFile({
        id: a.documentId,
        fileId: 'orig-file',
        fileName: 'a.pdf',
        fileType: 'application/pdf',
        fileSize: 10,
      });
      await biz().copyPdfByDocumentId(a.documentId, b.documentId);
      expect((await app.model('document').findByPk(b.documentId)).file_id).toBe('orig-file');

      const copyFile = jest.spyOn(biz().storageService.provider, 'copyFile');
      copyFile.mockResolvedValueOnce({ id: 'copied-file' });
      await biz().copyPdfByDocumentId(a.documentId, b.documentId, true);
      expect((await app.model('document').findByPk(b.documentId)).file_id).toBe('copied-file');
      copyFile.mockResolvedValueOnce(undefined);
      await biz().copyPdfByDocumentId(a.documentId, b.documentId, true);
      await biz().copyPdfByDocumentId('00000000-0000-4000-8000-000000000000', b.documentId);

      await biz().copyPdfAsAttachmentByDocumentId(a.documentId, b.documentId);
      await biz().copyPdfAsAttachmentByDocumentId('00000000-0000-4000-8000-000000000000', b.documentId);
      expect(await app.model('documentAttachment').count({ where: { document_id: b.documentId, link: 'orig-file' } })).toBe(1);

      const info = await biz().copyAttachmentsByEventSavedDocumentId(a.documentId, b.documentId);
      expect(info.copy.link).toBe('orig-file');
    });

    it('copies attachments with filters, regenerates links and replaces ids in document data', async () => {
      const a = await draft();
      const b = await draft();
      await attach(a.documentId, 'link-1');
      await attach(a.documentId, 'link-2', true);
      const filtered = await biz().copyAttachmentsByDocumentId(a.documentId, b.documentId, ['link-1']);
      expect(filtered.copy).toHaveLength(1);
      const noGenerated = await biz().copyAttachmentsByDocumentId(a.documentId, b.documentId, [], false, true);
      expect(noGenerated.original).toHaveLength(1);

      const copyFile = jest.spyOn(biz().storageService.provider, 'copyFile');
      copyFile.mockResolvedValueOnce({ id: 'new-link' }).mockResolvedValueOnce(undefined);
      const withoutSignatures = await biz().copyAttachmentsByDocumentId(a.documentId, b.documentId, [], true);
      expect(withoutSignatures.copy).toHaveLength(1);

      const replaced = await biz().replaceAttachmentsInfoInDocumentData(
        { files: [{ id: 'x1', link: 'l1', documentId: 'd1' }] },
        { original: [{ id: 'x1', link: 'l1', documentId: 'd1' }], copy: [{ id: 'y1', link: 'l2', documentId: 'd2' }] },
      );
      expect(replaced).toEqual({ files: [{ id: 'y1', link: 'l2', documentId: 'd2' }] });
      expect(await biz().replaceAttachmentsInfoInDocumentData({ a: 1 }, {})).toEqual({ a: 1 });
    });

    it('copies additional data signatures', async () => {
      const a = await draft();
      const b = await draft();
      await app.model('additionalDataSignature').create({
        document_id: a.documentId,
        data: 'one',
        signature: 'sig',
        certificate: 'fake-certificate',
        created_by: USER,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await biz().copyAdditionalDataSignaturesByDocumentId(a.documentId, b.documentId);
      expect(await app.model('additionalDataSignature').count({ where: { document_id: b.documentId } })).toBe(1);
      jest.spyOn(models().additionalDataSignature, 'getByDocumentId').mockResolvedValueOnce(undefined);
      await biz().copyAdditionalDataSignaturesByDocumentId(a.documentId, b.documentId);
    });
  });

  describe('updating and assigning', () => {
    it('updates a draft and rejects a missing, foreign or committed task', async () => {
      const task = await draft();
      const updated = await biz().update(task.id, USER, units, { meta: { k: 'v' } });
      expect(updated.id).toBe(task.id);
      await expect(biz().update('00000000-0000-4000-8000-000000000000', USER, units, {})).rejects.toThrow();
      await app.model('task').update({ finished: true }, { where: { id: task.id } });
      await expect(biz().update(task.id, USER, units, {})).rejects.toThrow('committed');
    });

    it('sets signers, performers and the due date with access checks', async () => {
      const task = await draft({ setPermissions: [{ performerUnits: [990011] }] });
      const signers = await biz().setSignerUsers(task.id, ['s1'], USER, units);
      expect(signers.signerUsers).toEqual(['s1']);
      await expect(biz().setSignerUsers('00000000-0000-4000-8000-000000000000', ['s1'], USER, units)).rejects.toThrow();

      jest.spyOn(biz().idApiClient, 'getUsersByIds').mockResolvedValue([{ name: 'Performer One' }]);
      const saveLog = jest.spyOn(biz().customLogs, 'saveCustomLog').mockImplementation(() => undefined);
      const updated = await biz().setPerformerUsers(task.id, ['p1'], [990011], USER);
      expect(updated.performerUsers).toEqual(['p1']);
      expect(saveLog).toHaveBeenCalledTimes(2);
      await expect(biz().setPerformerUsers(task.id, ['p1'], [1], USER)).rejects.toThrow();
      jest.spyOn(biz().idApiClient, 'getUsersByIds').mockRejectedValueOnce(new Error('id down'));
      await expect(biz().setPerformerUsers(task.id, ['p1'], [990011], USER)).rejects.toThrow('id down');

      const due = new Date(Date.now() + 86400000).toISOString();
      const withDue = await biz().setDueDate(task.id, due, [990011]);
      expect(withDue).toBeTruthy();
      await expect(biz().setDueDate(task.id, due, [1])).rejects.toThrow();
      await expect(biz().setDueDate('00000000-0000-4000-8000-000000000000', due, [990011])).rejects.toThrow();
    });

    it('merges task metadata and keeps once-defined fields', async () => {
      const task = await draft();
      const loaded = await models().task.findById(task.id);
      const merged = await biz().addTaskMetadata(loaded, USER, false, { a: 1 });
      expect(merged.meta.a).toBe(1);
      const overridden = await biz().addTaskMetadata(await models().task.findById(task.id), USER, true, { b: 2 });
      expect(overridden.meta.b).toBe(2);
      await expect(biz().addTaskMetadata({ ...loaded, finished: true }, USER, false, {})).rejects.toThrow('committed');
    });
  });

  describe('multisigners', () => {
    const signer = { ipn: IPN, firstName: 'Ivan', lastName: 'Petrenko', middleName: 'Ivanovych', email: 'ivan@example.test' };
    const userInfo = { ipn: IPN, firstName: 'ivan', lastName: 'PETRENKO', middleName: 'ivanovych' };
    const schemaFor = (calc: string, extra: any = {}) => ({
      ...extra,
      properties: { signers: { control: 'signature.multisign', calcSigners: calc } },
    });
    const signersDraft = (calc: string, extra: any = {}) => draft({}, schemaFor(calc, extra));
    const formula = (list: any[]) => `() => ${JSON.stringify(list)}`;

    it('calculates signers, stores them and the schema path', async () => {
      const task = await signersDraft(formula([signer]));
      jest.spyOn(biz().idApiClient, 'prepareUser').mockResolvedValue({ userId: 'signer-1' });
      const result = await biz().calcSigners(task.id, 'signers', USER, units, userInfo);
      expect(result.signerUsers).toEqual(['signer-1']);
      expect((await app.model('task').findByPk(task.id)).meta.multisignerSchemaPath).toBe('signers');
    });

    it('rejects broken schema, formulas and signer data', async () => {
      await expect(biz().calcSigners('00000000-0000-4000-8000-000000000000', 'signers', USER, units, userInfo)).rejects.toThrow();
      const ok = await signersDraft(formula([signer]));
      await expect(biz().calcSigners(ok.id, 'missing', USER, units, userInfo)).rejects.toThrow('control');
      const noFormula = await draft({}, { properties: { signers: { control: 'signature.multisign' } } });
      await expect(biz().calcSigners(noFormula.id, 'signers', USER, units, userInfo)).rejects.toThrow('formula');
      const empty = await signersDraft('() => null');
      await expect(biz().calcSigners(empty.id, 'signers', USER, units, userInfo)).rejects.toThrow('calculate');
      const duplicate = await signersDraft(formula([signer, { ...signer, firstName: 'Other', lastName: 'Name' }]));
      await expect(biz().calcSigners(duplicate.id, 'signers', USER, units, userInfo)).rejects.toThrow('duplicates');
      const missingUser = await signersDraft(formula([{ ...signer, ipn: '0987654321' }]));
      await expect(biz().calcSigners(missingUser.id, 'signers', USER, units, userInfo)).rejects.toThrow('signers list');
      await expect(biz().calcSigners(ok.id, 'signers', USER, units, { ...userInfo, firstName: 'Petro' })).rejects.toThrow();
      const badIpn = await signersDraft(formula([{ ...signer, ipn: 'bad' }]), { isContinueSignAvailable: true });
      await expect(biz().calcSigners(badIpn.id, 'signers', USER, units, userInfo)).rejects.toThrow('Incorrect ipn or email');
      jest.spyOn(biz().idApiClient, 'prepareUser').mockResolvedValue(undefined);
      await expect(biz().calcSigners(ok.id, 'signers', USER, units, userInfo)).rejects.toThrow('Can not find or create');
    });

    it('checks the access of a signer by ipn and name', async () => {
      const task = await signersDraft(formula([signer]));
      await app.model('task').update({ signer_users: [USER], signer_user_names: ['Petrenko Ivan'] }, { where: { id: task.id } });
      expect(await biz().checkUserAccessAsSigner(task.id, 'signers', USER, userInfo)).toBe(true);
      expect(await biz().checkUserAccessAsSigner(task.id, 'signers', USER, { ...userInfo, ipn: '0000000000' })).toBe(false);
      await expect(biz().checkUserAccessAsSigner(task.id, 'signers', USER, { ...userInfo, firstName: 'Petro' })).rejects.toThrow();
      await app.waitFor(async () => (await app.model('task').findByPk(task.id)).meta?.declinedSignerIds?.includes(USER));
      expect(await biz().checkUserAccessAsSigner(task.id, 'signers', USER, userInfo)).toBe(true);
      await expect(biz().checkUserAccessAsSigner(task.id, 'signers', 'stranger', userInfo)).rejects.toThrow('signerUsers');
      await expect(biz().checkUserAccessAsSigner(task.id, 'missing', USER, userInfo)).rejects.toThrow('control');
      await expect(biz().checkUserAccessAsSigner('00000000-0000-4000-8000-000000000000', 'signers', USER, userInfo)).rejects.toThrow();
      const noFormula = await draft({}, { properties: { signers: { control: 'signature.multisign' } } });
      await expect(biz().checkUserAccessAsSigner(noFormula.id, 'signers', USER, userInfo)).rejects.toThrow('formula');
      const nullFormula = await signersDraft('() => null');
      await expect(biz().checkUserAccessAsSigner(nullFormula.id, 'signers', USER, userInfo)).rejects.toThrow();
      const noSigners = await signersDraft(formula([signer]));
      await expect(biz().checkUserAccessAsSigner(noSigners.id, 'signers', USER, userInfo)).rejects.toThrow('signerUsers');
    });
  });

  describe('notifications', () => {
    it('detects a finished payment in document data', async () => {
      const paid = {
        document: { data: { pay: { calculated: { transactionId: 't' }, calculatedHistory: [], processed: [{ status: { isSuccess: true } }] } } },
      };
      expect(await biz().hasFinishedPayment(paid, 'pay.properties.control'.replace('control', ''))).toBeDefined();
      expect(await biz().hasFinishedPayment(paid, 'pay')).toBe(true);
      expect(await biz().hasFinishedPayment({ document: { data: { pay: {} } } }, 'pay')).toBe(false);
      expect(await biz().hasFinishedPayment({ document: { data: {} } })).toBe(false);
    });

    it('informs new performers through the notifier when the template asks for it', async () => {
      const send = jest.spyOn(biz().notifierService, 'sendToUser').mockResolvedValue(undefined as any);
      const task = await draft({ performerUserNotification: { title: '() => "Title"', text: '() => "Text"' } });
      const loaded = await models().task.findById(task.id);
      await biz().informNewPerformerUsers(loaded, []);
      await biz().informNewPerformerUsers(loaded, ['p1']);
      expect(send).toHaveBeenCalledWith(['p1'], 'Title', 'Text');
      const plain = await models().task.findById((await draft()).id);
      await biz().informNewPerformerUsers(plain, ['p1']);
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('notifies new performers on create, performer change and commit', async () => {
      const send = jest.spyOn(biz().notifierService, 'sendToUser').mockResolvedValue(undefined as any);
      const fn = '(ctx) => ({ userIds: ["u1"], title: "T", text: "X" })';
      const task = await draft({
        onCreate: { notifyNewPerformers: fn },
        onPerformersChange: { notifyNewPerformers: fn },
        onCommit: { notifyNewPerformers: fn },
        setPermissions: [{ performerUnits: [990011] }],
      });
      const loaded = await models().task.findById(task.id);
      send.mockClear();
      await biz().handleActivityTypeEvents(loaded, 'TASK_CREATED');
      await biz().handleActivityTypeEvents(loaded, 'TASK_PERFORMERS_CHANGED');
      await biz().handleActivityTypeEvents(loaded, 'TASK_COMMITTED');
      expect(send).toHaveBeenCalledTimes(3);
      await biz().handleActivityTypeEvents(loaded, 'OTHER');
    });

    it('rejects broken notifyNewPerformers functions and reports the error', async () => {
      jest.spyOn(biz().notifierService, 'sendToUser').mockResolvedValue(undefined as any);
      const task = await models().task.findById((await draft({ setPermissions: [{ performerUnits: [990011] }] })).id);
      await expect(biz().notifyNewPerformers('() => { throw new Error("x"); }', task)).rejects.toThrow('schema function throw error');
      await expect(biz().notifyNewPerformers('() => ({ userIds: ["u"] })', task)).rejects.toThrow('title, text');
      await expect(biz().notifyNewPerformers('() => ({ userIds: [] })', task)).resolves.toBeUndefined();
      const bad = await draft({ onCommit: { notifyNewPerformers: '() => ({ userIds: ["u"] })' } });
      await expect(biz().handleActivityTypeEvents(await models().task.findById(bad.id), 'TASK_COMMITTED')).rejects.toThrow();
      expect(await app.model('workflowError').count()).toBeGreaterThan(0);
    });
  });

  describe('helpers', () => {
    it('reads signature info and keeps errors per signature', async () => {
      jest
        .spyOn(biz().eds, 'getSignatureInfo')
        .mockResolvedValueOnce({ signer: { commonName: 'A' } } as any)
        .mockResolvedValueOnce(undefined as any);
      const result = await biz().getSignaturesInfo(['sig-1', 'sig-2']);
      expect(result).toHaveLength(2);
      expect(result[1].error).toBe('Signature is invalid.');
      await expect(biz().getSignaturesInfo([''])).rejects.toThrow('empty');
    });

    it('computes retry info and draft expiration', () => {
      expect(biz().getRetryInfo({}, {})).toBeUndefined();
      expect(biz().getRetryInfo({}, { retryIfError: [] })).toBeUndefined();
      const retry = biz().getRetryInfo({ retryIterator: 1, a: 1 }, { retryIfError: ['1m', '5m'] });
      expect(retry).toEqual({ retryMessage: { retryIterator: 2, a: 1 }, postponedTime: '5m' });
      const date = new Date('2026-01-01T00:00:00.000Z');
      expect(biz().prepareDraftExpiredAt('2d', date)).toContain('2026');
      expect(biz().prepareDraftExpiredAt('3h', date)).toContain('2026');
      expect(biz().prepareDraftExpiredAt('5m')).toBeTruthy();
      expect(biz().prepareDraftExpiredAt('2wd', date)).toContain('2026');
      expect(biz().prepareDraftExpiredAt(null)).toBeNull();
      expect(() => biz().prepareDraftExpiredAt('x')).toThrow('Invalid timeToAdd');
    });

    it('checks if creation by other systems is allowed', async () => {
      const config = getConfig();
      config.system_task = { isAllowedCreateByOtherSystems: true, tasksTemplateIds: [5] };
      expect(await biz().checkCreateByOtherSystemFromMessage({ taskTemplateId: 5 })).toBe(true);
      expect(await biz().checkCreateByOtherSystemFromMessage({ taskTemplateId: 6 })).toBe(false);
      config.system_task = { isAllowedCreateByOtherSystems: false };
      expect(await biz().checkCreateByOtherSystemFromMessage({ taskTemplateId: 5 })).toBe(false);
      delete config.system_task;
    });

    it('runs extended access checks', async () => {
      const document = { id: 'd1', data: { amount: 5 } };
      await expect(biz().extendedAccessCheck({}, document, USER)).rejects.toThrow('Invalid extendedAccessCheck');
      expect(await biz().extendedAccessCheck({ isEnabled: false, checks: [] }, document, USER)).toBe(true);
      expect(await biz().extendedAccessCheck({ isEnabled: '(data) => false', checks: [] }, document, USER)).toBe(true);
      await expect(biz().extendedAccessCheck({ isEnabled: '() => { throw new Error("x"); }', checks: [] }, document, USER)).rejects.toThrow(
        'isEnabled',
      );

      jest.spyOn(biz().idApiClient, 'getUsersByIds').mockResolvedValue([{ userId: USER, role: 'x' }]);
      const user = {
        isEnabled: true,
        context: [{ name: 'u', provider: 'user' }],
        checks: ['(data, ctx) => ctx.u.role === "x"', '(data) => data.amount === 5'],
      };
      expect(await biz().extendedAccessCheck(user, document, USER)).toBe(true);
      expect(await biz().extendedAccessCheck({ ...user, checks: ['() => false'] }, document, USER)).toBe(false);
      await expect(biz().extendedAccessCheck({ ...user, checks: ['() => 1'] }, document, USER)).rejects.toThrow('Boolean');
      await expect(biz().extendedAccessCheck({ ...user, checks: ['() => { throw new Error("x"); }'] }, document, USER)).rejects.toThrow('checks[0]');
      jest.spyOn(biz().idApiClient, 'getUsersByIds').mockRejectedValueOnce(new Error('down'));
      await expect(biz().extendedAccessCheck(user, document, USER)).rejects.toThrow('Cannot get user data');

      const reader = jest.spyOn((getBusinesses() as any).document.externalReader, 'getDataByUser').mockResolvedValue({ data: { ok: true } } as any);
      const external = {
        isEnabled: true,
        context: [{ name: 'e', provider: 'external-reader.svc.method', options: '(data) => ({ a: data.amount })' }],
        checks: ['(data, ctx) => ctx.e.ok'],
      };
      expect(await biz().extendedAccessCheck(external, document, USER)).toBe(true);
      expect(reader).toHaveBeenCalled();
      await expect(
        biz().extendedAccessCheck(
          { ...external, context: [{ name: 'e', provider: 'external-reader.svc.method', options: '() => { throw new Error("x"); }' }] },
          document,
          USER,
        ),
      ).rejects.toThrow('options');
    });
  });
});
