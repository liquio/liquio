import crypto from 'node:crypto';

import nock from 'nock';

import { ServicesRepositoryRequester } from '../src/services/event/requester/services_repository';
import { StandardPaymentReceiptDocumentRequesterProvider } from '../src/services/event/requester/document/providers/standard_payment_receipt';
import { TestApp } from './test-app';
import { setAppContext } from '../src/lib/context';

const REPO = 'http://repo.test';
const PAY = 'http://pay.test';

describe('Group C - services repository and payment receipt', () => {
  let app: TestApp;
  let repo: ServicesRepositoryRequester;
  let privateKeyBase64: string;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup({});
    setAppContext({ httpClient: app.httpClient });
    (global as any).httpClient = app.httpClient;
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    privateKeyBase64 = Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' }) as string).toString('base64');
    ServicesRepositoryRequester.singleton = undefined as any;
    repo = new ServicesRepositoryRequester({
      url: REPO,
      token: 'fake-token',
      timeout: 2000,
      serviceIdsMap: { svc: 'svc-id-1' },
      apiMethods: {
        createServiceRequest: '/create',
        createServiceStatus: '/status',
        getServiceRequest: '/get/',
        getServiceStatus: '/gstatus/',
        getAllUserServices: '/all/',
        checkHealth: '/health',
      },
    });
  });
  afterAll(async () => {
    await TestApp.afterAll(app);
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    nock.cleanAll();
    await TestApp.afterEach(app);
  });
  beforeEach(async () => {
    await TestApp.beforeEach(app);
  });

  describe('ServicesRepositoryRequester', () => {
    it('is a singleton', () => {
      expect(new ServicesRepositoryRequester({ url: 'http://other.test' })).toBe(repo);
      expect(repo.timeout).toBe(2000);
    });

    it('save: skips when only status id is passed', async () => {
      expect(await repo.save({ statusId: 1 })).toBeUndefined();
    });

    it('save: requires params to create a request', async () => {
      await expect(repo.save({ userIpn: '1234567890' })).rejects.toThrow('Required params for repository are undefined.');
    });

    it('save: requires status params to change status', async () => {
      await expect(repo.save({ repositoryServiceId: 'r1' })).rejects.toThrow('Required params to change service request status are undefined.');
      await expect(repo.save({ repositoryServiceId: 'r1', statusId: 2 })).rejects.toThrow(
        'Required params to change service request status are undefined.',
      );
    });

    it('save: creates a request with client_inn for an ipn', async () => {
      const scope = nock(REPO)
        .post('/create', { public_service_identifier: 'svc-id-1', service_foreign_id: 'req-1', client_inn: '1234567890' })
        .matchHeader('authorization', 'fake-token')
        .reply(200, { id: 'created-1' });
      expect(await repo.save({ userIpn: '1234567890', requestId: 'req-1', serviceName: 'svc' })).toEqual({ id: 'created-1' });
      expect(scope.isDone()).toBe(true);
    });

    it('createRequestToOrderService: uses client_passport for a passport number', async () => {
      nock(REPO)
        .post('/create', { public_service_identifier: 'svc-id-1', service_foreign_id: 'req-2', client_passport: 'АВ123456' })
        .reply(200, { ok: true });
      expect(await repo.createRequestToOrderService('АВ123456', 'req-2', 'svc')).toEqual({ ok: true });
    });

    it('createRequestToOrderService: uses client_passport for a 9 digit id card', async () => {
      nock(REPO)
        .post('/create', { public_service_identifier: 'svc-id-1', service_foreign_id: 'req-3', client_passport: '123456789' })
        .reply(200, { ok: 1 });
      expect(await repo.createRequestToOrderService('123456789', 'req-3', 'svc')).toEqual({ ok: 1 });
    });

    it('createRequestToOrderService: fails on unknown service name', async () => {
      await expect(repo.createRequestToOrderService('1234567890', 'req', 'unknown')).rejects.toThrow(
        "Can't get repository services IDs to define service.",
      );
    });

    it('createRequestToOrderService: logs and rethrows http errors', async () => {
      nock(REPO).post('/create').reply(500, { message: 'boom' });
      await expect(repo.createRequestToOrderService('1234567890', 'req', 'svc')).rejects.toThrow('500');
      expect(app.log.logs.find((l) => l.type === 'create-request-in-services-repository|exception')).toBeDefined();
    });

    it('save: changes the request status', async () => {
      nock(REPO).post('/status', { service_id: 'r1', service_status: 3, service_status_comment: 'done' }).reply(200, { changed: true });
      expect(await repo.save({ repositoryServiceId: 'r1', statusId: 3, statusComment: 'done' })).toEqual({ changed: true });
    });

    it('changeRequestStatus: logs and rethrows http errors', async () => {
      nock(REPO).post('/status').reply(400, {});
      await expect(repo.changeRequestStatus('r1', 3, 'c')).rejects.toThrow('400');
      expect(app.log.logs.find((l) => l.type === 'create-status-in-services-repository|exception')).toBeDefined();
    });

    it('getRequestToOrderService: validates and requests', async () => {
      await expect(repo.getRequestToOrderService('', 'r')).rejects.toThrow('Required params to send with are undefined.');
      nock(REPO).get('/get/1234567890/r1').matchHeader('authorization', 'fake-token').reply(200, { s: 1 });
      expect(await repo.getRequestToOrderService('1234567890', 'r1')).toEqual({ s: 1 });
      nock(REPO).get('/get/1234567890/r2').reply(404, {});
      await expect(repo.getRequestToOrderService('1234567890', 'r2')).rejects.toThrow('404');
      expect(app.log.logs.find((l) => l.type === 'get-request-in-services-repository|exception')).toBeDefined();
    });

    it('getRequestStatus: validates and requests', async () => {
      await expect(repo.getRequestStatus('')).rejects.toThrow('Required params to send with are undefined.');
      nock(REPO).get('/gstatus/s1').reply(200, { status: 'ok' });
      expect(await repo.getRequestStatus('s1')).toEqual({ status: 'ok' });
      nock(REPO).get('/gstatus/s2').reply(500, {});
      await expect(repo.getRequestStatus('s2')).rejects.toThrow('500');
      expect(app.log.logs.find((l) => l.type === 'create-request-status-in-services-repository|exception')).toBeDefined();
    });

    it('getAllUserOrderedServices: validates and requests', async () => {
      await expect(repo.getAllUserOrderedServices('')).rejects.toThrow('Required params to send with are undefined.');
      nock(REPO)
        .get('/all/1234567890')
        .reply(200, [{ id: 1 }]);
      expect(await repo.getAllUserOrderedServices('1234567890')).toEqual([{ id: 1 }]);
      nock(REPO).get('/all/0000000000').reply(500, {});
      await expect(repo.getAllUserOrderedServices('0000000000')).rejects.toThrow('500');
      expect(app.log.logs.find((l) => l.type === 'get-all-user-services-from-repository|exception')).toBeDefined();
    });

    it('sendPingRequest: rejects with a SyntaxError even for a successful json answer (axios already parsed it)', async () => {
      nock(REPO).get('/health').reply(200, { status: 'up' });
      await expect(repo.sendPingRequest()).rejects.toBeInstanceOf(SyntaxError);
      expect(app.log.logs.find((l) => l.type === 'send-ping-request-to-services-repository')).toBeDefined();
    });

    it('sendPingRequest: returns a numeric answer as is', async () => {
      nock(REPO).get('/health').reply(200, '7');
      expect(await repo.sendPingRequest()).toBe(7);
    });

    it('sendPingRequest: rejects with a SyntaxError when the request fails', async () => {
      nock(REPO).get('/health').reply(500, 'x');
      await expect(repo.sendPingRequest()).rejects.toBeInstanceOf(SyntaxError);
      expect(app.log.logs.find((l) => l.type === 'send-ping-request-to-services-repository')).toBeDefined();
    });

    it('isPassport matches two cyrillic letters and six digits', () => {
      expect(repo.isPassport('АВ123456')).toBe(true);
      expect(repo.isPassport('1234567890')).toBe(false);
    });
  });

  describe('StandardPaymentReceiptDocumentRequesterProvider', () => {
    const fn = (body: string) => `(documents, events) => ${body}`;
    const baseOptions = (): any => ({
      method: 'getPaymentReceipt',
      customer: 'cust',
      merchantName: fn('"m-list"'),
      orderId: fn('"ord-1"'),
      receiptName: fn('"receipt"'),
      receiptFormat: fn('"pdf"'),
      receiptMeta: fn('({ description: "Receipt" })'),
      documentId: fn('"doc-1"'),
      documents: [],
      events: [],
    });
    let provider: StandardPaymentReceiptDocumentRequesterProvider;
    let filestorage: any;
    let documentAttachmentModel: any;

    beforeEach(() => {
      provider = new StandardPaymentReceiptDocumentRequesterProvider({
        cust: {
          receiptUrl: PAY,
          routes: { getPaymentReceipt: '/receipt/<order_id>' },
          rsaPrivateKeyInBase64: privateKeyBase64,
          merchantName: 'default-merchant',
          merchantList: { 'm-list': 'listed-merchant' },
        },
      });
      filestorage = {
        uploadFileFromStream: jest.fn(async (_s, name, _d, type) => ({ id: `file-${name}`, name, contentType: type, contentLength: 5 })),
      };
      documentAttachmentModel = { create: jest.fn(async (v) => ({ id: 'att', ...v })) };
    });

    const nockReceiptInfo = (receipts: any[], result = 'ok') =>
      nock(PAY)
        .get('/receipt/ord-1')
        .matchHeader('x-auth-token', /^[\w-]+\.[\w-]+\.[\w-]+$/)
        .reply(200, { result, receipts });

    it('download: rejects an unknown method', async () => {
      await expect(provider.download({ method: 'nope' })).rejects.toThrow('Invalid provider method');
    });

    it('rejects an unknown customer', async () => {
      await expect(provider.download({ ...baseOptions(), customer: 'zzz' })).rejects.toThrow("Cannot find config for target payment customer 'zzz'");
    });

    it.each(['merchantName', 'orderId', 'receiptName', 'receiptFormat', 'receiptMeta', 'documentId'])(
      'wraps a throwing %s schema function',
      async (key) => {
        const options = { ...baseOptions(), [key]: fn('(() => { throw new Error("bad"); })()'), filestorage, documentAttachmentModel };
        await expect(provider.download(options)).rejects.toThrow(
          `saveDocument.standardPaymentReceipt.getPaymentReceipt.options.${key} schema function throw error.`,
        );
      },
    );

    it('downloads a single receipt and stores an attachment', async () => {
      nockReceiptInfo([{ link: `${PAY}/files/1.pdf` }]);
      nock(PAY).get('/files/1.pdf').reply(200, 'PDF-1', { 'content-type': 'application/pdf', 'content-length': '5' });

      const result = await provider.download({ ...baseOptions(), filestorage, documentAttachmentModel });

      expect(result.receiptInfo.result).toBe('ok');
      expect(result.documentAttachments).toHaveLength(1);
      expect(filestorage.uploadFileFromStream).toHaveBeenCalledWith(expect.anything(), 'receipt.pdf', undefined, 'application/pdf');
      expect(documentAttachmentModel.create).toHaveBeenCalledWith({
        documentId: 'doc-1',
        name: 'receipt.pdf',
        type: 'application/pdf',
        size: 5,
        link: 'file-receipt.pdf',
        isGenerated: false,
        isSystem: true,
        meta: { description: 'Receipt.pdf' },
      });
    });

    it('numbers files when there are several receipts', async () => {
      nockReceiptInfo([{ link: `${PAY}/files/1.pdf` }, { link: `${PAY}/files/2.pdf` }]);
      nock(PAY).get('/files/1.pdf').reply(200, 'A', { 'content-type': 'application/pdf' });
      nock(PAY).get('/files/2.pdf').reply(200, 'B', { 'content-type': 'application/pdf' });

      const result = await provider.download({ ...baseOptions(), filestorage, documentAttachmentModel });

      expect(result.documentAttachments.map((a: any) => a.name)).toEqual(['receipt-1.pdf', 'receipt-2.pdf']);
      expect(result.documentAttachments.map((a: any) => a.meta.description)).toEqual(['Receipt-1.pdf', 'Receipt-2.pdf']);
    });

    it('rejects a receipt with a wrong content type', async () => {
      nockReceiptInfo([{ link: `${PAY}/files/1.pdf` }]);
      nock(PAY).get('/files/1.pdf').reply(200, 'x', { 'content-type': 'text/html' });
      await expect(provider.download({ ...baseOptions(), filestorage, documentAttachmentModel })).rejects.toThrow(
        'Payment customer API respond with wrong content type',
      );
      expect(filestorage.uploadFileFromStream).not.toHaveBeenCalled();
    });

    it('wraps a file storage upload error', async () => {
      nockReceiptInfo([{ link: `${PAY}/files/1.pdf` }]);
      nock(PAY).get('/files/1.pdf').reply(200, 'x', { 'content-type': 'application/pdf' });
      filestorage.uploadFileFromStream.mockRejectedValue(new Error('fs down'));
      await expect(provider.download({ ...baseOptions(), filestorage, documentAttachmentModel })).rejects.toThrow(
        'Cannot upload receipt to file storage. Error: fs down',
      );
    });

    it('wraps a document attachment create error', async () => {
      nockReceiptInfo([{ link: `${PAY}/files/1.pdf` }]);
      nock(PAY).get('/files/1.pdf').reply(200, 'x', { 'content-type': 'application/pdf' });
      documentAttachmentModel.create.mockRejectedValue(new Error('db down'));
      await expect(provider.download({ ...baseOptions(), filestorage, documentAttachmentModel })).rejects.toThrow(
        'Cannot create document attachments. Error: db down',
      );
    });

    it('getPaymentReceiptFiles: uses the config merchant name when not in the list', async () => {
      nock(PAY).get('/receipt/o2').reply(200, { result: 'ok', receipts: [] }).persist(false);
      await expect(
        provider.getPaymentReceiptFiles({ customer: 'cust', merchantName: 'other', orderId: 'o2', contentType: 'application/pdf' }),
      ).rejects.toThrow('Get receipt info error');
    });

    it('getPaymentReceiptFiles: fails without any merchant name', async () => {
      const p = new StandardPaymentReceiptDocumentRequesterProvider({
        c2: { receiptUrl: PAY, routes: { getPaymentReceipt: '/r/<order_id>' }, rsaPrivateKeyInBase64: privateKeyBase64 },
      });
      await expect(p.getPaymentReceiptFiles({ customer: 'c2', merchantName: 'x', orderId: 'o', contentType: 'application/pdf' })).rejects.toThrow(
        'Cannot define merchantName',
      );
    });

    it('getPaymentReceiptInfo: rejects non ok results', async () => {
      nock(PAY)
        .get('/receipt/ord-1')
        .reply(200, { result: 'fail', receipts: [{ link: 'x' }] });
      await expect(provider.getPaymentReceiptInfo('cust', 'm', 'ord-1')).rejects.toThrow('Get receipt info error');
    });

    it('getPaymentReceiptInfo: attaches the response body to http errors', async () => {
      nock(PAY).get('/receipt/ord-1').reply(500, { why: 'broken' });
      const error: any = await provider.getPaymentReceiptInfo('cust', 'm', 'ord-1').catch((e) => e);
      expect(error.details).toEqual({ responseBody: { why: 'broken' } });
    });

    it('generateJwtToken: signs with RS256 and wraps invalid keys', () => {
      const token = provider.generateJwtToken({ order_id: 'o' }, 'cust');
      const [header] = token.split('.');
      expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({ alg: 'RS256' });
      const bad = new StandardPaymentReceiptDocumentRequesterProvider({
        cust: { rsaPrivateKeyInBase64: Buffer.from('not a key').toString('base64') },
      });
      expect(() => bad.generateJwtToken({}, 'cust')).toThrow('Cannot generate token');
      expect(app.log.logs.find((l) => l.type === 'standard-payment-receipt-document-request-provider|generate-jwt-token|sign-error')).toBeDefined();
    });
  });
});
