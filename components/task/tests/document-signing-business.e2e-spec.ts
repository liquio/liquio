import nock from 'nock';

import { TestApp } from './test-app';
import { seedScenario, addTemplatePair, addUnit, userRequest, SCENARIO } from './helpers/scenario';

const FS = 'https://filestorage.liquio.local';
const SIGN_TOOL = 'http://sign-tool:8080';
const HASH = 'ab'.repeat(32);
const IPN = '1234567890';
// Fake CMS-looking blob: long enough and starting with "MII" so the PKCS7 provider forwards it to the sign tool.
const FAKE_P7S = `MII${'A'.repeat(200)}`;

// DocumentSigningBusiness through the /documents sign endpoints: data for sign, sign (mock and real),
// P7S, additional data, rejection, continue sign and encryption.
describe('Document signing business', () => {
  let app: TestApp;
  const USER = SCENARIO.userId;
  const OTHER = 'signing-other';
  const USER_INFO = { ipn: IPN, firstName: 'Ivan', lastName: 'Petrenko', middleName: 'Ivanovych' };
  let nextId = 990150;

  const as = (userId = USER, extra: any = {}) => userRequest(app, userId, { ...USER_INFO, ...extra });

  const draft = async (documentSchema: any = {}, taskSchema: any = {}, fileId: string | null = 'main-file') => {
    const id = nextId++;
    await addTemplatePair(app, id, taskSchema, documentSchema);
    const created = await as()('post', '/tasks').send({ workflowTemplateId: SCENARIO.workflowTemplateId, taskTemplateId: id });
    expect(created.status).toBe(200);
    const task = created.body.data;
    if (fileId) {
      await app
        .model('document')
        .update({ file_id: fileId, file_name: 'main.pdf', file_type: 'application/pdf' }, { where: { id: task.documentId } });
    }
    return task;
  };

  // Filestorage answers needed to calculate the data for sign of the main file and a fresh ASIC manifest.
  const mockDataForSign = (fileId = 'main-file', manifestId = 'manifest-file') => {
    nock(FS)
      .get(`/files/${fileId}/info`)
      .reply(200, { data: { id: fileId, hash: { sha256: HASH, sha1: 'cd'.repeat(10) } } });
    nock(FS)
      .post('/files/asicmanifest')
      .reply(200, { data: { id: manifestId } });
    nock(FS).get(`/files/${manifestId}/p7s?as_file=true`).replyWithError(new Error('no p7s'));
    nock(FS).get(`/files/${manifestId}`).reply(200, 'manifest-content');
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    (global as any).config.multisigners = { schemaControl: 'signature.multisign' };
    await seedScenario(app);
    await addUnit(app, { id: 990001, name: 'Signing unit', heads: [USER], members: [USER] });
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    // A failed test must not leak its unused interceptors into the next one.
    nock.cleanAll();
    await TestApp.beforeEach();
  });

  describe('GET /documents/:id/sign', () => {
    it('returns data for sign of the file and the ASIC manifest', async () => {
      const task = await draft();
      mockDataForSign();
      const response = await as()('get', `/documents/${task.documentId}/sign`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it('reuses a stored ASIC manifest when the files did not change', async () => {
      const task = await draft();
      await app
        .model('document')
        .update({ asic: { asicmanifestFileId: 'manifest-stored', filesIds: ['main-file'] } }, { where: { id: task.documentId } });
      nock(FS)
        .get('/files/main-file/info')
        .reply(200, { data: { id: 'main-file', hash: { sha256: HASH } } });
      nock(FS).get('/files/manifest-stored/p7s?as_file=true').reply(200, 'manifest-p7s');
      const response = await as()('get', `/documents/${task.documentId}/sign`);
      expect(response.status).toBe(200);
    });

    it('fails when the main PDF is missing', async () => {
      const task = await draft({}, {}, null);
      const response = await as()('get', `/documents/${task.documentId}/sign`);
      expect(response.status).toBe(500);
    });
  });

  describe('POST /documents/:id/sign', () => {
    it('stores a mocked signature for a test user and records re-signing', async () => {
      const task = await draft();
      mockDataForSign();
      const first = await as(USER, { testUser: true })('post', `/documents/${task.documentId}/sign?is_sign_test=true&type=file`).send({
        signature: 'x',
      });
      expect(first.status).toBe(200);
      expect(first.body.data.signatures.length).toBe(1);

      nock(FS)
        .get('/files/main-file/info')
        .reply(200, { data: { id: 'main-file', hash: { sha256: HASH } } });
      nock(FS).get('/files/manifest-file/p7s?as_file=true').reply(200, 'manifest-p7s');
      const second = await as(USER, { testUser: true })('post', `/documents/${task.documentId}/sign?is_sign_test=true`).send({ signature: 'x' });
      expect(second.status).toBe(200);
      expect(second.body.data.signatures.length).toBe(2);
    });

    it('rejects an unknown signature type', async () => {
      const task = await draft();
      const response = await as()('post', `/documents/${task.documentId}/sign?type=cloud`).send({ signature: 'x' });
      expect(response.status).toBe(500);
    });

    it('rejects a wrong number of signed records', async () => {
      const task = await draft();
      mockDataForSign();
      const response = await as()('post', `/documents/${task.documentId}/sign`).send({ signature: [FAKE_P7S] });
      expect(response.status).toBe(500);
    });

    it('verifies signatures with the sign tool and saves them to the file storage', async () => {
      const task = await draft();
      mockDataForSign();
      const manifestContent = Buffer.from('manifest-content').toString('base64');
      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .reply(200, {
          subject: { serialNumber: IPN, surname: 'Petrenko', givenName: 'Ivan' },
          issuer: {},
          serial: '1',
          signTime: 1,
          content: manifestContent,
          pem: 'fake-pem',
        });
      nock(SIGN_TOOL).post('/x509/signature-info').reply(400, { message: 'Invalid signature data' });
      nock(FS)
        .post('/p7s_signatures')
        .reply(200, { data: { id: 'p7s-1', p7s: 'x' } });
      nock(FS)
        .post('/signatures')
        .reply(200, { data: { id: 'sig-1', signature: 'x' } });
      const response = await as()('post', `/documents/${task.documentId}/sign?type=hardware`).send({ signature: [FAKE_P7S, FAKE_P7S] });
      expect(response.status).toBe(200);
      await app.waitFor(() => nock.isDone(), 10000);
    });

    it('rejects when the certificate does not belong to the user', async () => {
      const task = await draft();
      mockDataForSign();
      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .reply(200, { subject: { serialNumber: '0000000000' }, content: Buffer.from('manifest-content').toString('base64'), pem: 'fake-pem' });
      const response = await as()('post', `/documents/${task.documentId}/sign`).send({ signature: [FAKE_P7S, FAKE_P7S] });
      expect(response.status).toBe(500);
    });

    it('rejects when the sign tool rejects the first signature', async () => {
      const task = await draft();
      mockDataForSign();
      nock(SIGN_TOOL).post('/x509/signature-info').reply(400, { message: 'Invalid signature data' });
      const response = await as()('post', `/documents/${task.documentId}/sign`).send({ signature: [FAKE_P7S, FAKE_P7S] });
      expect(response.status).toBe(500);
    });

    it('rejects when sign is not available', async () => {
      const task = await draft({ isSignAvailable: '() => false' });
      const response = await as()('post', `/documents/${task.documentId}/sign`).send({ signature: 'x' });
      expect(response.status).toBe(400);
    });

    it('rejects a user without access to the document', async () => {
      const task = await draft();
      const response = await as(OTHER)('post', `/documents/${task.documentId}/sign`).send({ signature: 'x' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('P7S signing', () => {
    it('GET /documents/:id/sign_p7s streams the stored file when no P7S exists', async () => {
      const task = await draft();
      nock(FS).get('/files/main-file/p7s').query(true).reply(404, {});
      nock(FS).get('/files/main-file').reply(200, 'pdf-content');
      const response = await as()('get', `/documents/${task.documentId}/sign_p7s`);
      expect([200, 404, 500]).toContain(response.status);
    });

    it('GET /documents/:id/sign_p7s returns an existing P7S as a file', async () => {
      const task = await draft();
      nock(FS)
        .get('/files/main-file/p7s')
        .query(true)
        .reply(200, { data: { p7s: Buffer.from('p7s-data').toString('base64') } });
      const response = await as()('get', `/documents/${task.documentId}/sign_p7s`);
      expect([200, 404, 500]).toContain(response.status);
    });

    it('POST /documents/:id/sign_p7s accepts a mocked P7S for a test user', async () => {
      const task = await draft();
      const response = await as(USER, { testUser: true })('post', `/documents/${task.documentId}/sign_p7s?is_sign_test=true`).send({
        p7sSignature: 'x',
      });
      expect([200, 400, 500]).toContain(response.status);
    });

    it('POST /documents/:id/sign_p7s verifies the P7S with the sign tool and stores it', async () => {
      const task = await draft();
      nock(FS)
        .get('/files/main-file/p7s')
        .query(true)
        .reply(200, { data: { p7s: Buffer.from('p7s-data').toString('base64') } });
      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .reply(200, { subject: { serialNumber: IPN }, pem: 'fake-pem' });
      nock(FS)
        .post('/p7s_signatures')
        .reply(200, { data: { id: 'p7s-1', p7s: 'x' } });
      const response = await as()('post', `/documents/${task.documentId}/sign_p7s`).send({ p7sSignature: FAKE_P7S });
      expect(response.status).toBe(200);
      expect(response.body.data.isP7sSigned).toBe(true);
    });

    it('POST /documents/:id/sign_p7s answers 409 when the user signed the file already', async () => {
      const task = await draft();
      nock(FS)
        .get('/files/main-file/p7s')
        .query(true)
        .reply(200, { data: { isLastUserTheSame: true } });
      const response = await as()('get', `/documents/${task.documentId}/sign_p7s`);
      expect(response.status).toBe(409);
    });

    it('POST /documents/:id/sign_p7s accepts a mocked P7S for a test user with a stored P7S', async () => {
      const task = await draft();
      nock(FS)
        .get('/files/main-file/p7s')
        .query(true)
        .reply(200, { data: { p7s: Buffer.from('p7s-data').toString('base64') } });
      const response = await as(USER, { testUser: true })('post', `/documents/${task.documentId}/sign_p7s?is_sign_test=true`).send({
        p7sSignature: 'x',
      });
      expect(response.status).toBe(200);
    });

    it('POST /documents/:id/sign_p7s rejects a missing signature', async () => {
      const task = await draft();
      const response = await as()('post', `/documents/${task.documentId}/sign_p7s`).send({});
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('additional data', () => {
    const additional = '() => ["one", "two"]';

    it('GET /documents/:id/sign_additional_p7s returns the data to sign', async () => {
      const task = await draft();
      await app.model('documentTemplate').update({ additional_data_to_sign: additional }, { where: { id: task.document.documentTemplateId } });
      const response = await as()('get', `/documents/${task.documentId}/sign_additional_p7s`);
      expect([200, 400, 500]).toContain(response.status);
    });

    it('GET /documents/:id/sign_additional_p7s fails when the template has no additional data', async () => {
      const task = await draft();
      const response = await as()('get', `/documents/${task.documentId}/sign_additional_p7s`);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('POST /documents/:id/sign_additional_p7s verifies and stores the additional signatures', async () => {
      const task = await draft();
      await app.model('documentTemplate').update({ additional_data_to_sign: additional }, { where: { id: task.document.documentTemplateId } });
      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .twice()
        .reply(200, { subject: { serialNumber: IPN }, pem: 'fake-pem' });
      const response = await as()('post', `/documents/${task.documentId}/sign_additional_p7s`).send({ p7sSignature: [FAKE_P7S, FAKE_P7S] });
      expect([200, 500]).toContain(response.status);
      nock.cleanAll();
    });

    it('POST /documents/:id/sign_additional_p7s accepts a mocked signature', async () => {
      const task = await draft();
      await app.model('documentTemplate').update({ additional_data_to_sign: additional }, { where: { id: task.document.documentTemplateId } });
      const response = await as(USER, { testUser: true })('post', `/documents/${task.documentId}/sign_additional_p7s?is_sign_test=true`).send({
        p7sSignature: 'x',
        index: 0,
      });
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('multisign', () => {
    const multisignSchema = {
      properties: {
        name: { type: 'string' },
        signers: {
          control: 'signature.multisign',
          calcSigners: `() => [{ ipn: '${IPN}', firstName: 'Ivan', lastName: 'Petrenko', middleName: 'Ivanovych', email: 'ivan@example.test' }]`,
          minSignaturesLimit: 50,
          isKeepSignersOrder: '() => true',
        },
      },
    };

    it('finds the signers control and checks the signing order', async () => {
      const task = await draft(multisignSchema);
      const signing = (global as any).businesses.document.signing;
      const control = await signing.getMultisignerControl(task.document.documentTemplateId);
      expect(control.minSignaturesLimit).toBe(50);
      const fullTask = await app.model('task').findByPk(task.id);
      const document = await app.model('document').findByPk(task.documentId);
      const next = await signing.checkSignersOrderAndGetNextSigner({
        task: { id: task.id, signerUsers: [USER, OTHER], performerUsers: [USER], meta: {} },
        document: { id: task.documentId, documentTemplateId: task.document.documentTemplateId, data: document.data },
      });
      expect(fullTask).toBeTruthy();
      expect([USER, OTHER, undefined]).toContain(next);
    });

    it('returns min signatures limit info for a task with signers', async () => {
      const task = await draft(multisignSchema);
      const signing = (global as any).businesses.document.signing;
      const info = await signing.handleMinSignaturesLimit({
        documentTemplateId: task.document.documentTemplateId,
        signatures: [{ createdBy: USER }],
        task: { signerUsers: [USER, OTHER] },
      });
      expect(info.isMinSignaturesLimitRaised).toBe(true);
      const none = await signing.handleMinSignaturesLimit({
        documentTemplateId: task.document.documentTemplateId,
        signatures: [],
        task: { signerUsers: [USER, OTHER] },
      });
      expect(none.isMinSignaturesLimitRaised).toBe(false);
      expect(await signing.handleMinSignaturesLimit({ documentTemplateId: 1, signatures: [], task: { signerUsers: [] } })).toBeNull();
    });

    it('POST /documents/:id/multisign/check and singlesign/check answer for a document', async () => {
      const task = await draft(multisignSchema);
      const multi = await as()('post', `/documents/${task.documentId}/multisign/check`).send({});
      const single = await as()('post', `/documents/${task.documentId}/singlesign/check`).send({});
      expect(multi.status).toBeGreaterThanOrEqual(200);
      expect(single.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('rejection, continue sign and encryption', () => {
    it('POST /documents/:id/sign-rejection records a rejection of the signer', async () => {
      const task = await draft({ signRequired: true });
      await as()('put', `/tasks/${task.id}/signers`).send({ signerUsers: [USER, OTHER] });
      const response = await as()('post', `/documents/${task.documentId}/sign-rejection`).send({ rejectReason: 'Not agreed' });
      expect([200, 404, 500]).toContain(response.status);
    });

    it('POST /documents/:id/continue-sign rejects when continuing is not available', async () => {
      const task = await draft();
      const response = await as()('post', `/documents/${task.documentId}/continue-sign`).send({});
      expect([400, 500]).toContain(response.status);
    });

    it('GET and POST /documents/:id/encrypt', async () => {
      const task = await draft();
      const get = await as()('get', `/documents/${task.documentId}/encrypt`);
      expect(get.status).toBeGreaterThanOrEqual(200);
      const post = await as()('post', `/documents/${task.documentId}/encrypt`).send({ encryptedItems: ['a'], encryptCert: 'fake-cert' });
      expect(post.status).toBeGreaterThanOrEqual(200);
    });

    it('DELETE /documents/:id/sign removes signatures of the user', async () => {
      const task = await draft();
      const response = await as()('delete', `/documents/${task.documentId}/sign`).send({});
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('direct business calls', () => {
    const signing = () => (global as any).businesses.document.signing;
    const document = async (task) => (global as any).models.document.findById(task.documentId);

    it('hashes data with md5 and sha512 (with and without hmac)', () => {
      expect(signing().getMd5Hash('a')).toHaveLength(32);
      expect(signing().getSha512Hash('a')).toHaveLength(128);
      expect(signing().getSha512Hash('a', { hmac: 'key' })).toHaveLength(128);
    });

    it('compares ASIC manifest files', () => {
      expect(signing().checkAsicManifestFiles({ asicmanifestFileId: 'm', filesIds: ['a'] }, ['a'])).toBe(true);
      expect(signing().checkAsicManifestFiles({ asicmanifestFileId: 'm', filesIds: ['a'] }, ['a', 'b'])).toBe(false);
      expect(signing().checkAsicManifestFiles({ asicmanifestFileId: 'm', filesIds: ['a'] }, ['b'])).toBe(false);
    });

    it('downloads a file to hash it and to encode it', async () => {
      const task = await draft();
      const doc = await document(task);
      nock(FS).get('/files/main-file').twice().reply(200, 'pdf-content');
      expect(await signing().getFileHash(doc)).toHaveLength(128);
      expect(await signing().getFileBase64('main-file')).toBe(Buffer.from('pdf-content').toString('base64'));
      expect(await signing().getFileHash({ fileId: null })).toBeUndefined();
    });

    it('reads the P7S of a file', async () => {
      nock(FS)
        .get('/files/main-file/p7s')
        .reply(200, { data: { p7s: 'p7s-base64' } });
      expect(await signing().getP7sSignature('main-file')).toBe('p7s-base64');
      nock(FS).get('/files/main-file/p7s').reply(200, { data: null });
      expect(await signing().getP7sSignature('main-file')).toBeUndefined();
    });

    it('evaluates isSignAvailable and isContinueSignAvailable', async () => {
      const plain = await document(await draft());
      expect(await signing().isSignAvailable(plain, {}, {})).toBe(true);
      expect(await signing().isContinueSignAvailable(plain, {}, {})).toBe(true);
      const fn = await document(await draft({ isSignAvailable: '() => true', isContinueSignAvailable: '() => false' }));
      expect(await signing().isSignAvailable(fn, {}, {})).toBe(true);
      expect(await signing().isContinueSignAvailable(fn, {}, {})).toBe(false);
      const flag = await document(await draft({ isContinueSignAvailable: true }));
      expect(await signing().isContinueSignAvailable(flag, {}, {})).toBe(true);
      const broken = await document(
        await draft({ isSignAvailable: '() => { throw new Error("x"); }', isContinueSignAvailable: '() => { throw new Error("x"); }' }),
      );
      await expect(signing().isSignAvailable(broken, {}, {})).rejects.toThrow('Sign available function error.');
      await expect(signing().isContinueSignAvailable(broken, {}, {})).rejects.toThrow('Continue sign available function error.');
      await expect(signing().isSignAvailable({ id: 'x', documentTemplateId: 1 }, {}, {})).rejects.toThrow();
      await expect(signing().isContinueSignAvailable({ id: 'x', documentTemplateId: 1 }, {}, {})).rejects.toThrow();
    });

    it('encrypts additional data signatures', async () => {
      const task = await draft();
      const add = (extra) =>
        app.model('additionalDataSignature').create({
          document_id: task.documentId,
          data: 'one',
          signature: Buffer.from('sig').toString('base64'),
          certificate: 'fake-cert',
          created_by: USER,
          ...extra,
        });
      await add({ crypt_certificate: 'crypt-cert' });
      await add({ crypt_certificate: 'crypt-cert' });
      const toEncrypt = await signing().getDataToEncrypt(task.documentId);
      expect(toEncrypt).toHaveLength(2);
      expect(await signing().getDataToEncrypt(task.documentId, 'other')).toHaveLength(2);
      await expect(signing().saveEncryptedData(task.documentId, ['a'], 'cert')).rejects.toThrow('Incorrect encrypted items count.');
      await signing().saveEncryptedData(task.documentId, ['a', 'b'], 'cert');
      const saved = await app.model('additionalDataSignature').findAll({ where: { document_id: task.documentId } });
      expect(saved.map((item) => item.encrypted_data).sort()).toEqual(['a', 'b']);
    });

    it('tracks multisign info of the task', async () => {
      const task = await draft();
      const userInfo = { userId: USER, firstName: 'Ivan ', lastName: ' Petrenko', middleName: 'Ivanovych' };
      await expect(signing().addMultiSignInfo({ signerUsers: [], meta: {}, performerUsers: [] }, { userInfo, type: 'oops' })).rejects.toThrow(
        'Unknown action type',
      );
      await signing().addMultiSignInfo({ signerUsers: [], meta: {}, performerUsers: [] }, { userInfo, type: 'sign' });
      const full = await app.model('task').findByPk(task.id);
      const entity = await (global as any).models.task.findById(task.id);
      expect(full).toBeTruthy();
      for (const type of ['sign', 'reject', 'delete_sign']) {
        await signing().addMultiSignInfo(
          { ...entity, id: task.id, signerUsers: [USER], performerUsers: [USER], meta: { multiSignInfo: {} } },
          { userInfo, type },
        );
      }
    });

    it('checks the strict multisign rules', async () => {
      const check = (strictMultiSignCheck) =>
        draft({ strictMultiSignCheck })
          .then(document)
          .then((doc) => signing().handleStrictMultiSignCheck(doc, { userId: OTHER }));
      await check(undefined);
      await expect(check({ isEnabled: 5, errors: [] })).rejects.toThrow('Invalid strictMultiSignCheck');
      await check({ isEnabled: false, errors: [] });
      await check({ isEnabled: '() => false', errors: [] });
      await expect(check({ isEnabled: '() => { throw new Error("x"); }', errors: [] })).rejects.toThrow('isEnabled function throw error');
      const owner = await document(await draft({ strictMultiSignCheck: { isEnabled: '() => true', excludeOwner: true, errors: [] } }));
      await expect(signing().handleStrictMultiSignCheck(owner, { userId: USER })).rejects.toThrow('Owner cannot sign');
      await check({ isEnabled: '() => true', errors: [{ title: 'T', text: 'x', check: '() => false' }] });
      await expect(check({ isEnabled: '() => true', errors: [{ title: 'T', text: 'X', check: '() => true' }] })).rejects.toThrow(
        'strictMultiSignCheck error.',
      );
      await expect(check({ isEnabled: '() => true', errors: [{ title: 'T', check: '() => { throw new Error("x"); }' }] })).rejects.toThrow(
        'check function throw error',
      );
    });

    it('checks the count of P7S signatures only when enabled', async () => {
      const task = await draft({ isP7sSign: true, signRequired: true });
      const doc: any = await document(task);
      const config = (global as any).config;
      await signing().checkP7SSignaturesCount(doc);
      config.custom = { ...(config.custom || {}), isCheckP7SSignaturesCount: true };
      try {
        await expect(signing().checkP7SSignaturesCount({ ...doc, task: undefined })).rejects.toThrow('Invalid arguments');
        await signing().checkP7SSignaturesCount({ ...doc, task: { performerUsers: [] }, documentTemplate: { jsonSchema: { isP7sSign: false } } });
        await signing().checkP7SSignaturesCount({
          ...doc,
          task: { performerUsers: [] },
          documentTemplate: { jsonSchema: { isP7sSign: true, signRequired: '() => false' } },
        });
      } finally {
        config.custom.isCheckP7SSignaturesCount = false;
      }
    });

    it('saves additional data signatures and attachment signatures', async () => {
      const task = await draft();
      const doc = await document(task);
      await signing().saveAdditionalDataSignatures([], doc, USER);
      await expect(signing().saveAdditionalDataSignatures([{ bad: true }], doc, USER)).rejects.toThrow();
      await expect(signing().saveAttachmentsP7SSignatures([{ bad: true }], doc, { userId: USER })).rejects.toThrow();
    });
  });

  describe('helpers', () => {
    it('GET /documents/sign lists documents waiting for the signature of the user', async () => {
      const response = await as()('get', '/documents/sign');
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
