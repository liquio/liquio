import nock from 'nock';

import { TestApp } from './test-app';
import { PaymentService } from '../src/services/payment';
import { seedScenario, addTemplatePair, addUnit, userRequest, SCENARIO } from './helpers/scenario';

const FS = 'https://filestorage.liquio.local';
const CUSTOMER = 'scenarioPay';
const PROVIDER = 'scenarioProvider';
const PDF = Buffer.from('%PDF-1.4 fake receipt');

// DocumentPaymentBusiness with a fake provider registered on the PaymentService (fake credentials only):
// calculation, status handling with commit and receipts, SMS confirmation, hold and unhold, receipts and statuses.
describe('Document payment business', () => {
  let app: TestApp;
  let provider: any;
  const USER = SCENARIO.userId;
  let nextId = 990250;

  const as = (userId = USER) => userRequest(app, userId);
  const payment = () => (global as any).businesses.document.payment;

  const control = (extra: any = {}) => ({
    type: 'object',
    control: 'payment',
    customer: CUSTOMER,
    paymentControlPath: 'pay.properties.control',
    recipients: [{ amount: '() => 10;', currency: 'UAH', description: "() => 'Fee';", orderId: '(document) => document?.id;' }],
    ...extra,
  });
  const documentSchema = (controlExtra: any = {}) => ({
    required: [],
    properties: { pay: { type: 'object', properties: { control: control(controlExtra) } } },
  });

  // A draft task whose document has a payment control; `calc` runs calc_payment when set.
  const draft = async (controlExtra: any = {}, taskSchema: any = {}, calc = true) => {
    const id = nextId++;
    await addTemplatePair(app, id, taskSchema, documentSchema(controlExtra));
    const created = await as()('post', '/tasks').send({ workflowTemplateId: SCENARIO.workflowTemplateId, taskTemplateId: id });
    expect(created.status).toBe(200);
    const task = created.body.data;
    if (calc) {
      const calculated = await as()('post', `/documents/${task.documentId}/calc_payment`).send({
        paymentControlPath: 'pay.properties.control',
        extraData: {},
      });
      expect(calculated.status).toBe(200);
    }
    return task;
  };

  const status = (task, overrides: any = {}) => ({
    transactionId: 'tx-1',
    documentId: task.documentId,
    paymentControlPath: 'pay.properties.control',
    extraData: { redirectUrl: 'https://provider.example/back', order_id: 'order-1' },
    status: { isSuccess: true },
    ...overrides,
  });

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await seedScenario(app);
    await addUnit(app, { id: 990001, name: 'Payment unit', heads: [USER], members: [USER] });
    const service = new PaymentService(undefined) as any;
    provider = {
      calculatePayment: jest.fn(async (data) => ({
        transactionId: `tx-${Math.random().toString(36).slice(2)}`,
        amount: 10,
        url: 'https://provider.example/pay',
        recipients: data.recipients,
      })),
      handleStatus: jest.fn(),
      cancelOrder: jest.fn(async () => ({ cancelled: true })),
      confirmBySmsCode: jest.fn(async () => ({})),
      unHoldOrder: jest.fn(async () => ({ unheld: true })),
      getPaymentReceiptInfo: jest.fn(async () => ({ receipt: 'info' })),
      getWithdrawalFundsStatus: jest.fn(async () => ({ withdrawal: 'done' })),
      getPaymentReceiptFiles: jest.fn(async () => [{ fileBuffer: PDF, contentType: 'application/pdf' }]),
    };
    service.providers[PROVIDER] = provider;
    (global as any).config.payment = { [CUSTOMER]: { providerName: PROVIDER, doRedirect: true } };
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    nock.cleanAll();
    await TestApp.beforeEach();
    provider.handleStatus.mockReset();
  });

  describe('calculation', () => {
    it('calculates a payment for a recipients list and reuses the pending checkout', async () => {
      const task = await draft();
      const document = (await as()('get', `/documents/${task.documentId}`)).body.data;
      expect(document.data.pay.control.calculated.transactionId).toBeTruthy();
      expect(provider.calculatePayment).toHaveBeenCalled();
    });

    it('calculates a payment from amount formulas', async () => {
      const task = await draft({
        recipients: undefined,
        amount: '() => 5;',
        description: "() => 'Fee';",
        orderId: '() => "order";',
        recipient: '() => "recipient";',
        payer: '() => "payer";',
        suffixFormula: '() => "sfx";',
        orderNum: '() => 7;',
      });
      expect(task.documentId).toBeTruthy();
      const call = provider.calculatePayment.mock.calls.at(-1)[0];
      expect(call.amount).toBe(5);
    });

    it('rejects a missing payment control and an unknown document', async () => {
      const task = await draft({}, {}, false);
      const missing = await as()('post', `/documents/${task.documentId}/calc_payment`).send({ paymentControlPath: 'pay.properties.unknown' });
      expect(missing.status).toBe(500);
      const unknown = await as()('post', '/documents/00000000-0000-4000-8000-000000000000/calc_payment').send({
        paymentControlPath: 'pay.properties.control',
      });
      expect(unknown.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects a provider that returns nothing', async () => {
      const task = await draft({}, {}, false);
      provider.calculatePayment.mockResolvedValueOnce(undefined);
      const response = await as()('post', `/documents/${task.documentId}/calc_payment`).send({ paymentControlPath: 'pay.properties.control' });
      expect(response.status).toBe(500);
    });

    it('rechecks a pending checkout through the provider on the next calculation', async () => {
      const task = await draft();
      provider.handleStatus.mockResolvedValueOnce(status(task, { transactionId: 'unknown-tx' }));
      const response = await as()('post', `/documents/${task.documentId}/calc_payment`).send({ paymentControlPath: 'pay.properties.control' });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('status handling', () => {
    const calculatedTransaction = async (task) => {
      const document = (await as()('get', `/documents/${task.documentId}`)).body.data;
      return document.data.pay.control.calculated.transactionId;
    };

    it('stores a successful status, commits the task after payment and redirects', async () => {
      const task = await draft({ commitAfterPayment: true });
      const transactionId = await calculatedTransaction(task);
      provider.handleStatus.mockResolvedValueOnce(status(task, { transactionId }));
      const result = await payment().handlePaymentStatus({}, CUSTOMER, 'success', {}, {});
      expect(result.url).toBe('https://provider.example/back');
      const stored = await as()('get', `/tasks/${task.id}`);
      expect(stored.body.data.finished).toBe(true);
      expect(stored.body.data.document.isFinal).toBe(true);
    });

    it('records a failed status without committing', async () => {
      const task = await draft({ commitAfterPayment: true });
      const transactionId = await calculatedTransaction(task);
      provider.handleStatus.mockResolvedValueOnce(status(task, { transactionId, status: { isSuccess: false } }));
      await payment().handlePaymentStatus({}, CUSTOMER, 'fail', {}, {});
      const stored = await as()('get', `/tasks/${task.id}`);
      expect(stored.body.data.finished).toBe(false);
    });

    it('marks the task as held when the transaction was a hold', async () => {
      const task = await draft({}, {}, false);
      provider.calculatePayment.mockResolvedValueOnce({ transactionId: 'tx-hold', amount: 10, extraData: { isHold: true, sessionId: 's-1' } });
      await as()('post', `/documents/${task.documentId}/calc_payment`).send({
        paymentControlPath: 'pay.properties.control',
        extraData: { isHold: true },
      });
      provider.handleStatus.mockResolvedValueOnce(
        status(task, { transactionId: 'tx-hold', extraData: { redirectUrl: 'https://provider.example/back', paymentId: 'p-1' } }),
      );
      await payment().handlePaymentStatus({}, CUSTOMER, 'success', {}, {});
      const stored = await as()('get', `/tasks/${task.id}`);
      expect(stored.body.data.meta.isHoldPayment).toBe(true);
    });

    it('returns the status info without redirect when asked to check the previous transaction', async () => {
      const task = await draft();
      const transactionId = await calculatedTransaction(task);
      provider.handleStatus.mockResolvedValueOnce(status(task, { transactionId }));
      const result = await payment().handlePaymentStatus({}, CUSTOMER, 'success', {}, {}, true);
      expect(result.transactionId).toBe(transactionId);
    });

    it('answers a short response for providers that only notify', async () => {
      const task = await draft();
      const transactionId = await calculatedTransaction(task);
      (global as any).config.payment[CUSTOMER] = { providerName: PROVIDER, notifyUrlShortResponse: true };
      try {
        provider.handleStatus.mockResolvedValueOnce(status(task, { transactionId }));
        expect(await payment().handlePaymentStatus({}, CUSTOMER, 'success', {}, {})).toEqual({ isAccepted: true });
        provider.handleStatus.mockResolvedValueOnce(status(task, { transactionId }));
        (global as any).config.payment[CUSTOMER] = { providerName: PROVIDER };
        expect((await payment().handlePaymentStatus({}, CUSTOMER, 'success', {}, {})).transactionId).toBe(transactionId);
      } finally {
        (global as any).config.payment[CUSTOMER] = { providerName: PROVIDER, doRedirect: true };
      }
    });

    it('fails for an unknown status, document or template', async () => {
      provider.handleStatus.mockResolvedValueOnce(undefined);
      await expect(payment().handlePaymentStatus({}, CUSTOMER, 'success', {}, {})).rejects.toThrow("Can't get payment status.");
      provider.handleStatus.mockResolvedValueOnce({ ...status({ documentId: '00000000-0000-4000-8000-000000000000' }) });
      await expect(payment().handlePaymentStatus({}, CUSTOMER, 'success', {}, {})).rejects.toThrow();
    });

    it('updates a register record when the control has a status handler', async () => {
      const task = await draft({
        onReceiveStatusHandlers: [
          {
            type: 'register.update-one-record',
            keyId: '() => 13;',
            recordId: '() => "rec-1";',
            newRecordData: '({ currentRecordData, status }) => ({ ...currentRecordData, paid: status.status.isSuccess });',
          },
        ],
      });
      const transactionId = await calculatedTransaction(task);
      const registerUrl = `${(global as any).config.register.server}:${(global as any).config.register.port}`;
      nock(registerUrl)
        .get('/records/rec-1')
        .reply(200, { data: { id: 'rec-1', data: { a: 1 } } });
      nock(registerUrl)
        .put('/records/rec-1')
        .reply(200, { data: { id: 'rec-1' } });
      provider.handleStatus.mockResolvedValueOnce(status(task, { transactionId }));
      await payment().handlePaymentStatus({}, CUSTOMER, 'success', {}, {});
    });

    it('rejects a register handler with a wrong key id and wrong handlers list', async () => {
      const task = await draft({
        onReceiveStatusHandlers: [{ type: 'register.update-one-record', keyId: '() => "x";', recordId: '() => "r";', newRecordData: '() => ({})' }],
      });
      const transactionId = await calculatedTransaction(task);
      provider.handleStatus.mockResolvedValueOnce(status(task, { transactionId }));
      await expect(payment().handlePaymentStatus({}, CUSTOMER, 'success', {}, {})).rejects.toThrow('keyId should be a number');
      const bad = await draft({ onReceiveStatusHandlers: ['nope'] });
      const badTransaction = await calculatedTransaction(bad);
      provider.handleStatus.mockResolvedValueOnce(status(bad, { transactionId: badTransaction }));
      await expect(payment().handlePaymentStatus({}, CUSTOMER, 'success', {}, {})).rejects.toThrow('onReceiveStatusHandlers');
    });

    it('downloads and attaches payment receipts', async () => {
      const task = await draft({ isDownloadReceipt: true, receiptName: 'receipt', receiptMeta: '() => ({ kind: "receipt" })' });
      const transactionId = await calculatedTransaction(task);
      nock(FS)
        .post('/files')
        .query(true)
        .reply(200, { data: { id: 'receipt-file', name: 'receipt.pdf', contentType: 'application/pdf', contentLength: PDF.length } });
      provider.handleStatus.mockResolvedValueOnce(status(task, { transactionId }));
      await payment().handlePaymentStatus({}, CUSTOMER, 'success', {}, {});
      await app.waitFor(async () => (await app.model('documentAttachment').count({ where: { document_id: task.documentId } })) > 0);
    });

    it('logs and swallows receipt download errors', async () => {
      const task = await draft();
      const document = await (global as any).models.document.findById(task.documentId);
      provider.getPaymentReceiptFiles.mockResolvedValueOnce([{ fileBuffer: Buffer.from('not a pdf'), contentType: 'application/pdf' }]);
      await payment().tryToDownloadPaymentReceiptFiles({ document, providerOptions: {}, orderId: 'o', paymentSchemaControl: {} });
      provider.getPaymentReceiptFiles.mockRejectedValueOnce(new Error('down'));
      await payment().tryToDownloadPaymentReceiptFiles({ document, providerOptions: {}, orderId: 'o', paymentSchemaControl: {} });
    });
  });

  describe('confirmation, cancel, receipts and unhold', () => {
    it('confirms by SMS code and rejects a document without calculated data', async () => {
      const task = await draft();
      const result = await payment().confirmBySmsCode('1234', CUSTOMER, 'pay.properties.control', task.documentId, USER, {
        all: [],
        head: [],
        member: [],
      });
      expect(result.isConfirmed).toBe(0);
      provider.confirmBySmsCode.mockRejectedValueOnce(new Error('wrong code'));
      expect(
        (await payment().confirmBySmsCode('0000', CUSTOMER, 'pay.properties.control', task.documentId, USER, { all: [], head: [], member: [] }))
          .isConfirmed,
      ).toBe(0);
      const fresh = await draft({}, {}, false);
      await expect(
        payment().confirmBySmsCode('1234', CUSTOMER, 'pay.properties.control', fresh.documentId, USER, { all: [], head: [], member: [] }),
      ).rejects.toThrow('calculated payment data does not exist');
    });

    it('cancels orders and surfaces provider errors', async () => {
      expect(await payment().cancelOrder(CUSTOMER, 'o', 't', 's')).toEqual({ cancelled: true });
      provider.cancelOrder.mockRejectedValueOnce(new Error('no'));
      await expect(payment().cancelOrder(CUSTOMER, 'o', 't', 's')).rejects.toThrow('no');
    });

    it('reads receipt info and the withdrawal status', async () => {
      const task = await draft();
      const units = { all: [], head: [], member: [] };
      expect(await payment().getPaymentReceiptInfo('pay.properties.control', task.documentId, 'o', USER, units)).toEqual({ receipt: 'info' });
      expect(await payment().getWithdrawalFundsStatus('pay.properties.control', task.documentId, 'o', USER, units)).toEqual({ withdrawal: 'done' });
      provider.getPaymentReceiptInfo.mockResolvedValueOnce(undefined);
      await expect(payment().getPaymentReceiptInfo('pay.properties.control', task.documentId, 'o', USER, units)).rejects.toThrow(
        "Can't get payment receipt.",
      );
      provider.getWithdrawalFundsStatus.mockResolvedValueOnce(undefined);
      await expect(payment().getWithdrawalFundsStatus('pay.properties.control', task.documentId, 'o', USER, units)).rejects.toThrow();
      await expect(payment().getPaymentReceiptInfo('pay.properties.unknown', task.documentId, 'o', USER, units)).rejects.toThrow(
        'payment properties',
      );
      await expect(
        payment().getWithdrawalFundsStatus('pay.properties.control', '00000000-0000-4000-8000-000000000000', 'o', USER, units),
      ).rejects.toThrow();
    });

    it('unholds a paid hold payment on commit and fails without processed data', async () => {
      const task = await draft({}, {}, false);
      provider.calculatePayment.mockResolvedValueOnce({ transactionId: 'tx-h2', amount: 10, extraData: { isHold: true, sessionId: 's-2' } });
      await as()('post', `/documents/${task.documentId}/calc_payment`).send({ paymentControlPath: 'pay.properties.control', extraData: {} });
      provider.handleStatus.mockResolvedValueOnce(
        status(task, { transactionId: 'tx-h2', extraData: { redirectUrl: 'x', paymentId: 'p-2', order_id: 'o' } }),
      );
      await payment().handlePaymentStatus({}, CUSTOMER, 'success', {}, {});
      const document = await (global as any).models.document.findById(task.documentId);
      const template = await (global as any).models.documentTemplate.findById(document.documentTemplateId);
      await payment().unholdPayment(document, { paymentControlPath: 'pay.properties.control' }, template.jsonSchema, USER);
      expect(provider.unHoldOrder).toHaveBeenCalled();
      provider.unHoldOrder.mockResolvedValueOnce(undefined);
      await expect(payment().unholdPayment(document, { paymentControlPath: 'pay.properties.control' }, template.jsonSchema, USER)).rejects.toThrow(
        'empty',
      );
      provider.unHoldOrder.mockRejectedValueOnce(new Error('provider down'));
      await expect(payment().unholdPayment(document, { paymentControlPath: 'pay.properties.control' }, template.jsonSchema, USER)).rejects.toThrow(
        'provider down',
      );
      await expect(payment().unholdPayment(document, { paymentControlPath: 'pay.properties.unknown' }, template.jsonSchema, USER)).rejects.toThrow(
        'payment properties',
      );
      await expect(
        payment().unholdPayment(
          { ...document, data: { pay: { control: {} } } },
          { paymentControlPath: 'pay.properties.control' },
          template.jsonSchema,
          USER,
        ),
      ).rejects.toThrow('processed payment data');
    });

    it('finds strict payment controls of the schema', () => {
      const schema = {
        properties: {
          a: { control: 'payment', strictPayment: true, paymentControlPath: 'a' },
          b: { control: 'payment.widget', strictPayment: true, paymentControlPath: 'b' },
          c: { control: 'payment.widget.new', strictPayment: true, paymentControlPath: 'c' },
          d: { control: 'payment', paymentControlPath: 'd' },
        },
      };
      expect(payment().getStrictPaymentControlPath(schema)).toEqual(['a', 'b', 'c']);
      expect(payment().getStrictPaymentControlPath({})).toEqual([]);
    });
  });
});
