import { DocumentBusiness } from './document';

// Characterization tests for the 7 payment-orchestration methods on DocumentBusiness.
// PaymentService is mocked out (instance property override, matching the existing
// convention in document.spec.ts of assigning mocked services directly onto the
// instance, e.g. `documentBusiness.storageService = {...}`) because this file tests
// document.ts's own orchestration logic (config lookups, argument construction, error
// propagation) — not PaymentService/provider behavior itself, which is covered elsewhere.
describe('DocumentBusiness payment methods', () => {
  let documentBusiness: any;

  const basePaymentConfig = {
    testCustomer: {
      providerName: 'testProvider',
      doRedirect: false,
      notifyUrlShortResponse: false,
    },
    sumForTest: 1,
    applePay: {
      someOption: true,
    },
  };

  const buildConfig = (overrides = {}) => ({
    storage: {},
    filestorage: {},
    eds: { timeout: 30000, pkcs7: { timeout: 30000, signToolUrl: 'http://localhost:3004' } },
    download_token: { jwtSecret: 'YourJWTSecretKey' },
    external_reader: {},
    register: {},
    auth: { LiquioId: {} },
    notifier: {},
    // Deep-clone so mutations in one test (e.g. flipping doRedirect, deleting applePay)
    // never leak into other tests via the shared basePaymentConfig object.
    payment: JSON.parse(JSON.stringify(basePaymentConfig)),
    ...overrides,
  });

  beforeEach(() => {
    (DocumentBusiness as any).singleton = null;
    global.config = buildConfig();
    global.db = {
      define: jest.fn().mockReturnValue({ prototype: {} }),
      sync: jest.fn(),
      authenticate: jest.fn(),
      transaction: jest.fn(),
      query: jest.fn(),
      close: jest.fn(),
    } as any;
    documentBusiness = new DocumentBusiness(global.config);

    global.log = {
      save: jest.fn(),
    } as any;

    global.models = {
      document: {
        findById: jest.fn(),
        updateData: jest.fn(),
      },
      documentTemplate: {
        findById: jest.fn(),
      },
    } as any;

    // Mock out the PaymentService instance created in the constructor - tests here
    // only care about how document.ts calls into it, not its own behavior.
    documentBusiness.paymentService = {
      calculatePayment: jest.fn(),
      handleStatus: jest.fn(),
      confirmBySmsCode: jest.fn(),
      cancelOrder: jest.fn(),
      getPaymentReceiptInfo: jest.fn(),
      getWithdrawalFundsStatus: jest.fn(),
      unHoldPayment: jest.fn(),
    };
  });

  afterEach(() => {
    (DocumentBusiness as any).singleton = null;
    jest.restoreAllMocks();
  });

  describe('calculatePayment', () => {
    const documentId = 'doc-1';
    const userId = 'user-1';
    const userName = 'User Name';
    const userUnitIds = { all: [], head: [], member: [] };
    const userContactData = { email: 'a@b.com' };
    const payload = { paymentControlPath: 'payment', extraData: { foo: 'bar' } };

    const jsonSchema = {
      properties: {
        payment: {
          customer: 'testCustomer',
          amount: '(document) => document.amount',
          description: '(document) => `Payment for ${document.name}`',
          orderId: '(document) => `order-${document.id}`',
          recipient: '(document) => document.name',
          payer: '(document) => document.payerName',
          suffixFormula: '(document) => "suffix"',
          orderNum: '(document) => 7',
        },
      },
    };

    const documentTemplate = { id: 'tpl-1', name: 'Template 1', jsonSchema };

    const documentEntity = {
      id: documentId,
      task: { id: 'task-1', workflowId: 'workflow-1' },
      documentTemplateId: 'tpl-1',
      data: {},
      amount: 100,
      name: 'Alice',
      payerName: 'Bob',
    };

    it('builds the expected data/config shape and forwards it to PaymentService.calculatePayment (happy path)', async () => {
      jest.spyOn(documentBusiness, 'findByIdAndCheckAccess').mockResolvedValue(documentEntity);
      (global.models.documentTemplate.findById as jest.Mock).mockResolvedValue(documentTemplate);

      const paymentData = { transactionId: 'tx-1', amount: 100 };
      documentBusiness.paymentService.calculatePayment.mockResolvedValue(paymentData);

      const updatedDocument = { id: documentId, data: { payment: { calculated: paymentData } } };
      (global.models.document.updateData as jest.Mock).mockResolvedValue(updatedDocument);

      const result = await documentBusiness.calculatePayment(
        documentId,
        payload,
        userId,
        userName,
        userUnitIds,
        userContactData,
        undefined,
        undefined,
      );

      expect(documentBusiness.paymentService.calculatePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentSystemParams: basePaymentConfig.testCustomer,
          documentId,
          workflowId: 'workflow-1',
          paymentControlPath: payload.paymentControlPath,
          paymentCustomer: 'testCustomer',
          extraData: payload.extraData,
          userName,
          userContactData,
          sumForTest: basePaymentConfig.sumForTest,
          // Resolved formula values (amount/description/orderId/etc.) - not the raw
          // document/jsonSchema/paymentProperties blob.
          amount: 100,
          description: 'Payment for Alice',
          orderId: `order-${documentId}`,
          recipient: 'Alice',
          payer: 'Bob',
          orderIdSuffix: 'suffix',
          orderNum: 7,
        }),
      );
      expect(documentBusiness.paymentService.calculatePayment).toHaveBeenCalledWith(
        expect.not.objectContaining({
          document: expect.anything(),
          jsonSchema: expect.anything(),
          paymentProperties: expect.anything(),
        }),
      );
      expect(global.models.document.updateData).toHaveBeenCalledWith(documentId, userId, expect.any(Object));
      expect(result).toBe(updatedDocument);
    });

    it('propagates the error when PaymentService.calculatePayment returns no data', async () => {
      jest.spyOn(documentBusiness, 'findByIdAndCheckAccess').mockResolvedValue(documentEntity);
      (global.models.documentTemplate.findById as jest.Mock).mockResolvedValue(documentTemplate);
      documentBusiness.paymentService.calculatePayment.mockResolvedValue(undefined);

      await expect(
        documentBusiness.calculatePayment(documentId, payload, userId, userName, userUnitIds, userContactData, undefined, undefined),
      ).rejects.toThrow('Can\'t get payment data.');
    });

    it('throws NotFoundError when the document does not exist', async () => {
      jest.spyOn(documentBusiness, 'findByIdAndCheckAccess').mockResolvedValue(null);

      await expect(
        documentBusiness.calculatePayment(documentId, payload, userId, userName, userUnitIds, userContactData, undefined, undefined),
      ).rejects.toThrow();
      expect(documentBusiness.paymentService.calculatePayment).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentStatus', () => {
    const paymentCustomer = 'testCustomer';
    const status = 'success';
    const payload = { some: 'payload' };

    const documentEntity: any = {
      id: 'doc-1',
      documentTemplateId: 'tpl-1',
      task: { id: 'task-1', workflowId: 'wf-1', createdBy: 'user-1' },
      data: {
        payment: {
          calculatedHistory: [{ transactionId: 'tx-1', extraData: {} }],
          processed: [],
        },
      },
    };

    const documentTemplate = {
      id: 'tpl-1',
      jsonSchema: { properties: { payment: { customer: paymentCustomer } } },
    };

    beforeEach(() => {
      (global.models.document.findById as jest.Mock).mockResolvedValue(documentEntity);
      (global.models.documentTemplate.findById as jest.Mock).mockResolvedValue(documentTemplate);
      (global.models.document.updateData as jest.Mock).mockResolvedValue(documentEntity);
      global.businesses = { task: { addTaskMetadata: jest.fn(), handleActivityTypeEvents: jest.fn() } } as any;
    });

    it('resolves providerOptions from config.payment[paymentCustomer] and shapes the response for a redirect provider', async () => {
      const statusInfo = {
        documentId: 'doc-1',
        paymentControlPath: 'payment',
        extraData: { redirectUrl: 'https://redirect.example.com', order_id: 'order-1' },
        transactionId: 'tx-1',
        status: { isSuccess: false },
      };
      documentBusiness.paymentService.handleStatus.mockResolvedValue(statusInfo);
      global.config.payment.testCustomer.doRedirect = true;

      const result = await documentBusiness.handlePaymentStatus(payload, paymentCustomer, status, undefined, undefined, false);

      expect(documentBusiness.paymentService.handleStatus).toHaveBeenCalledWith(
        payload,
        global.config.payment.testCustomer,
        status,
        undefined,
        undefined,
        false,
      );
      expect(result).toEqual({ url: statusInfo.extraData.redirectUrl, ...statusInfo });
    });

    it('returns a short accepted response when notifyUrlShortResponse is configured and no redirect is set', async () => {
      const statusInfo = {
        documentId: 'doc-1',
        paymentControlPath: 'payment',
        extraData: { redirectUrl: undefined, order_id: 'order-1' },
        transactionId: 'tx-1',
        status: { isSuccess: false },
      };
      documentBusiness.paymentService.handleStatus.mockResolvedValue(statusInfo);
      global.config.payment.testCustomer.doRedirect = false;
      global.config.payment.testCustomer.notifyUrlShortResponse = true;

      const result = await documentBusiness.handlePaymentStatus(payload, paymentCustomer, status, undefined, undefined, false);

      expect(result).toEqual({ isAccepted: true });
    });

    it('throws NotFoundError when PaymentService.handleStatus returns no status info', async () => {
      documentBusiness.paymentService.handleStatus.mockResolvedValue(undefined);

      await expect(documentBusiness.handlePaymentStatus(payload, paymentCustomer, status, undefined, undefined, false)).rejects.toThrow(
        'Can\'t get payment status.',
      );
    });

    it('throws NotFoundError when the resolved document does not have a task', async () => {
      documentBusiness.paymentService.handleStatus.mockResolvedValue({
        documentId: 'doc-1',
        paymentControlPath: 'payment',
        extraData: {},
        transactionId: 'tx-1',
        status: { isSuccess: false },
      });
      (global.models.document.findById as jest.Mock).mockResolvedValue({ id: 'doc-1', task: null });

      await expect(documentBusiness.handlePaymentStatus(payload, paymentCustomer, status, undefined, undefined, false)).rejects.toThrow();
    });
  });

  describe('confirmBySmsCode', () => {
    const smsCode = '123456';
    const paymentCustomer = 'testCustomer';
    const paymentControlPath = 'payment';
    const documentId = 'doc-1';
    const userId = 'user-1';
    const userUnitIds = { all: [], head: [], member: [] };

    const documentEntity = {
      id: documentId,
      data: {
        payment: { calculated: { transactionId: 'tx-1' } },
      },
    };

    it('forwards providerOptions, calculated payment data and sms code to PaymentService.confirmBySmsCode (happy path)', async () => {
      jest.spyOn(documentBusiness, 'findByIdAndCheckAccess').mockResolvedValue(documentEntity);
      (global.models.document.updateData as jest.Mock).mockResolvedValue(documentEntity);
      documentBusiness.paymentService.confirmBySmsCode.mockResolvedValue(undefined);

      const result = await documentBusiness.confirmBySmsCode(smsCode, paymentCustomer, paymentControlPath, documentId, userId, userUnitIds);

      expect(documentBusiness.paymentService.confirmBySmsCode).toHaveBeenCalledWith(
        basePaymentConfig.testCustomer,
        documentEntity.data.payment.calculated,
        smsCode,
      );
      expect(result).toEqual({ isConfirmed: 0, transactionId: 'tx-1' });
    });

    it('swallows the PaymentService.confirmBySmsCode error, logs it, and still updates the document', async () => {
      jest.spyOn(documentBusiness, 'findByIdAndCheckAccess').mockResolvedValue(documentEntity);
      (global.models.document.updateData as jest.Mock).mockResolvedValue(documentEntity);
      const providerError = new Error('provider failure');
      documentBusiness.paymentService.confirmBySmsCode.mockRejectedValue(providerError);

      // document.ts today catches and only logs this error - it does not rethrow.
      const result = await documentBusiness.confirmBySmsCode(smsCode, paymentCustomer, paymentControlPath, documentId, userId, userUnitIds);

      expect(global.log.save).toHaveBeenCalledWith('confirm-code-response-error', { error: providerError }, 'error');
      expect(result).toEqual({ isConfirmed: 0, transactionId: 'tx-1' });
    });

    it('throws when there is no calculated payment data on the document', async () => {
      jest.spyOn(documentBusiness, 'findByIdAndCheckAccess').mockResolvedValue({ id: documentId, data: {} });

      await expect(documentBusiness.confirmBySmsCode(smsCode, paymentCustomer, paymentControlPath, documentId, userId, userUnitIds)).rejects.toThrow(
        'Can not handle confirm code, calculated payment data does not exist.',
      );
      expect(documentBusiness.paymentService.confirmBySmsCode).not.toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    const paymentCustomer = 'testCustomer';
    const orderId = 'order-1';
    const transactionId = 'tx-1';
    const sessionId = 'session-1';

    it('forwards providerOptions and args to PaymentService.cancelOrder and returns its result (happy path)', async () => {
      const cancelResult = { isCancelled: true };
      documentBusiness.paymentService.cancelOrder.mockResolvedValue(cancelResult);

      const result = await documentBusiness.cancelOrder(paymentCustomer, orderId, transactionId, sessionId);

      expect(documentBusiness.paymentService.cancelOrder).toHaveBeenCalledWith(basePaymentConfig.testCustomer, orderId, transactionId, sessionId);
      expect(result).toBe(cancelResult);
    });

    it('logs and rethrows when PaymentService.cancelOrder fails', async () => {
      const providerError = new Error('cancel failed');
      documentBusiness.paymentService.cancelOrder.mockRejectedValue(providerError);

      await expect(documentBusiness.cancelOrder(paymentCustomer, orderId, transactionId, sessionId)).rejects.toThrow(providerError);
      expect(global.log.save).toHaveBeenCalledWith('cancel-order-payment-document-error', { error: providerError.message }, 'error');
    });
  });

  describe('getPaymentReceiptInfo', () => {
    const paymentControlPath = 'payment';
    const documentId = 'doc-1';
    const orderId = 'order-1';
    const userId = 'user-1';
    const userUnitIds = { all: [], head: [], member: [] };

    it('resolves provider options via getPaymentProviderOptionsByDocId and forwards them to PaymentService.getPaymentReceiptInfo (happy path)', async () => {
      const providerOptions = basePaymentConfig.testCustomer;
      jest.spyOn(documentBusiness, 'getPaymentProviderOptionsByDocId').mockResolvedValue(providerOptions);
      const receipt = { url: 'https://receipt.example.com' };
      documentBusiness.paymentService.getPaymentReceiptInfo.mockResolvedValue(receipt);

      const result = await documentBusiness.getPaymentReceiptInfo(paymentControlPath, documentId, orderId, userId, userUnitIds);

      expect(documentBusiness.getPaymentProviderOptionsByDocId).toHaveBeenCalledWith(paymentControlPath, documentId, userId, userUnitIds);
      expect(documentBusiness.paymentService.getPaymentReceiptInfo).toHaveBeenCalledWith(providerOptions, orderId);
      expect(result).toBe(receipt);
    });

    it('propagates the error when resolving provider options fails', async () => {
      const lookupError = new Error('document not found');
      jest.spyOn(documentBusiness, 'getPaymentProviderOptionsByDocId').mockRejectedValue(lookupError);

      await expect(documentBusiness.getPaymentReceiptInfo(paymentControlPath, documentId, orderId, userId, userUnitIds)).rejects.toThrow(lookupError);
      expect(documentBusiness.paymentService.getPaymentReceiptInfo).not.toHaveBeenCalled();
    });

    it('throws when PaymentService.getPaymentReceiptInfo returns no receipt', async () => {
      jest.spyOn(documentBusiness, 'getPaymentProviderOptionsByDocId').mockResolvedValue(basePaymentConfig.testCustomer);
      documentBusiness.paymentService.getPaymentReceiptInfo.mockResolvedValue(undefined);

      await expect(documentBusiness.getPaymentReceiptInfo(paymentControlPath, documentId, orderId, userId, userUnitIds)).rejects.toThrow(
        'Can\'t get payment receipt.',
      );
    });
  });

  describe('getWithdrawalFundsStatus', () => {
    const paymentControlPath = 'payment';
    const documentId = 'doc-1';
    const orderId = 'order-1';
    const userId = 'user-1';
    const userUnitIds = { all: [], head: [], member: [] };

    it('resolves provider options via getPaymentProviderOptionsByDocId and forwards them to PaymentService.getWithdrawalFundsStatus (happy path)', async () => {
      const providerOptions = basePaymentConfig.testCustomer;
      jest.spyOn(documentBusiness, 'getPaymentProviderOptionsByDocId').mockResolvedValue(providerOptions);
      const withdrawalStatus = { isWithdrawn: true };
      documentBusiness.paymentService.getWithdrawalFundsStatus.mockResolvedValue(withdrawalStatus);

      const result = await documentBusiness.getWithdrawalFundsStatus(paymentControlPath, documentId, orderId, userId, userUnitIds);

      expect(documentBusiness.getPaymentProviderOptionsByDocId).toHaveBeenCalledWith(paymentControlPath, documentId, userId, userUnitIds);
      expect(documentBusiness.paymentService.getWithdrawalFundsStatus).toHaveBeenCalledWith(providerOptions, orderId);
      expect(result).toBe(withdrawalStatus);
    });

    it('propagates the error when resolving provider options fails', async () => {
      const lookupError = new Error('document not found');
      jest.spyOn(documentBusiness, 'getPaymentProviderOptionsByDocId').mockRejectedValue(lookupError);

      await expect(documentBusiness.getWithdrawalFundsStatus(paymentControlPath, documentId, orderId, userId, userUnitIds)).rejects.toThrow(
        lookupError,
      );
      expect(documentBusiness.paymentService.getWithdrawalFundsStatus).not.toHaveBeenCalled();
    });

    it('throws when PaymentService.getWithdrawalFundsStatus returns no status', async () => {
      jest.spyOn(documentBusiness, 'getPaymentProviderOptionsByDocId').mockResolvedValue(basePaymentConfig.testCustomer);
      documentBusiness.paymentService.getWithdrawalFundsStatus.mockResolvedValue(undefined);

      await expect(documentBusiness.getWithdrawalFundsStatus(paymentControlPath, documentId, orderId, userId, userUnitIds)).rejects.toThrow(
        'Can\'t get payment data.',
      );
    });
  });

  // validateApplePaySession does NOT go through PaymentService/the provider system at all
  // (confirmed by reading document.ts): it validates config/domain and then calls Apple's
  // session-validation endpoint directly via global.httpClient. So these tests exercise it
  // independently of the PaymentService mock set up in the outer beforeEach.
  describe('validateApplePaySession', () => {
    const validSession = {
      validationUrl: 'https://apple-pay-gateway.example.com/session',
      displayName: 'Test Merchant',
      initiative: 'web',
      initiativeContext: 'example.com',
    };

    beforeEach(() => {
      global.config.allowedApplePayGateway = 'apple-pay-gateway.example.com';
      global.config.merchantIdentityCertificateInBase64 = Buffer.from('cert').toString('base64');
      global.config.merchantIdentityPrivateKeyInBase64 = Buffer.from('key').toString('base64');
      global.config.merchantIdentifier = 'merchant.example';
      global.httpClient = { request: jest.fn() } as any;
    });

    it('sends a request to the Apple Pay validation endpoint and returns the parsed response (happy path)', async () => {
      const applePayResponse = { epochTimestamp: 123, merchantSessionIdentifier: 'abc' };
      (global.httpClient.request as jest.Mock).mockResolvedValue({ json: jest.fn().mockResolvedValue(applePayResponse) });

      const result = await documentBusiness.validateApplePaySession(validSession);

      expect(global.httpClient.request).toHaveBeenCalledWith(
        validSession.validationUrl,
        expect.objectContaining({ method: 'POST' }),
        'validate-apple-pay-session',
      );
      expect(result).toEqual(applePayResponse);
      expect(documentBusiness.paymentService.calculatePayment).not.toHaveBeenCalled();
    });

    it('throws InvalidConfigError when payment.applePay config is missing', async () => {
      global.config.payment.applePay = undefined;

      await expect(documentBusiness.validateApplePaySession(validSession)).rejects.toThrow('payment.applePay required.');
      expect(global.httpClient.request).not.toHaveBeenCalled();
    });

    it('throws ForbiddenError when the validationUrl domain is not the allowed Apple Pay gateway', async () => {
      await expect(
        documentBusiness.validateApplePaySession({ ...validSession, validationUrl: 'https://not-allowed.example.com/session' }),
      ).rejects.toThrow(/not allowed Apple Pay gateway/);
      expect(global.httpClient.request).not.toHaveBeenCalled();
    });
  });
});
