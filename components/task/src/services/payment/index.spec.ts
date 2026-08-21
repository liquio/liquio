import { PaymentService } from './index';
import { BadRequestError } from '../../lib/errors';

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let fakeProvider: {
    calculatePayment: jest.Mock;
    handleStatus: jest.Mock;
    confirmBySmsCode: jest.Mock;
    cancelOrder: jest.Mock;
    unHoldOrder: jest.Mock;
    checkStatus: jest.Mock;
    getPaymentReceiptInfo: jest.Mock;
    getPaymentReceiptFiles: jest.Mock;
    getWithdrawalFundsStatus: jest.Mock;
    sendCheckRequest: jest.Mock;
  };

  beforeEach(() => {
    global.log = {
      save: jest.fn(),
    } as any;

    // Reset singleton so each test starts from a clean `providers` object,
    // mirroring the pattern used in message_queue/index.spec.ts.
    (PaymentService as any).singleton = null;
    paymentService = new PaymentService({});

    fakeProvider = {
      calculatePayment: jest.fn(),
      handleStatus: jest.fn(),
      confirmBySmsCode: jest.fn(),
      cancelOrder: jest.fn(),
      unHoldOrder: jest.fn(),
      checkStatus: jest.fn(),
      getPaymentReceiptInfo: jest.fn(),
      getPaymentReceiptFiles: jest.fn(),
      getWithdrawalFundsStatus: jest.fn(),
      sendCheckRequest: jest.fn(),
    };

    // `providers` is a plain field on the instance (not truly private at
    // runtime), so tests can swap it directly per-case.
    paymentService.providers = { fakeProvider };
  });

  afterEach(() => {
    jest.clearAllMocks();
    (PaymentService as any).singleton = null;
  });

  describe('constructor / singleton', () => {
    it('returns the same instance on repeated construction', () => {
      const other = new PaymentService({});
      expect(other).toBe(paymentService);
      // providers set on the first instance survive on the singleton.
      expect(other.providers).toBe(paymentService.providers);
    });
  });

  describe('calculatePayment', () => {
    it('resolves with the provider result on the happy path', async () => {
      const data = { paymentSystemParams: { providerName: 'fakeProvider' }, amount: 100 };
      const providerResult = { paymentUrl: 'https://pay.example/1' };
      fakeProvider.calculatePayment.mockResolvedValue(providerResult);

      const result = await paymentService.calculatePayment(data);

      expect(result).toBe(providerResult);
      expect(fakeProvider.calculatePayment).toHaveBeenCalledWith(data);
      expect(global.log.save).toHaveBeenCalledWith(
        'calculate-payment-data-provider-result',
        { result: providerResult },
      );
    });

    it('wraps the provider error into a new Error with .cause set', async () => {
      const originalError = new Error('calc boom');
      fakeProvider.calculatePayment.mockRejectedValue(originalError);
      const data = { paymentSystemParams: { providerName: 'fakeProvider' } };

      await expect(paymentService.calculatePayment(data)).rejects.toMatchObject({
        message: 'calc boom',
        cause: originalError,
      });
      expect(global.log.save).toHaveBeenCalledWith(
        'calculate-payment-data-error',
        { error: 'calc boom' },
        'error',
      );
    });

    it('throws a wrapped Error (not the raw BadRequestError) for an unknown provider', async () => {
      const data = { paymentSystemParams: { providerName: 'unknownProvider' } };

      const rejection = paymentService.calculatePayment(data);
      await expect(rejection).rejects.toBeInstanceOf(Error);
      await expect(rejection).rejects.not.toBeInstanceOf(BadRequestError);
      await expect(rejection).rejects.toMatchObject({
        cause: expect.any(BadRequestError),
      });
    });
  });

  describe('handleStatus', () => {
    it('resolves with the provider result on the happy path', async () => {
      const data = { orderId: '1' };
      const providerOptions = { providerName: 'fakeProvider' };
      const status = 'success';
      const queryParamsObject = { a: 1 };
      const headersObject = { h: 1 };
      const checkPrevTransaction = true;
      const providerResult = { status: 'ok' };
      fakeProvider.handleStatus.mockResolvedValue(providerResult);

      const result = await paymentService.handleStatus(
        data,
        providerOptions,
        status,
        queryParamsObject,
        headersObject,
        checkPrevTransaction,
      );

      expect(result).toBe(providerResult);
      expect(fakeProvider.handleStatus).toHaveBeenCalledWith(
        data,
        providerOptions,
        status,
        queryParamsObject,
        headersObject,
        checkPrevTransaction,
      );
      expect(global.log.save).toHaveBeenCalledWith(
        'handle-payment-status-on-provider-result',
        { result: providerResult },
      );
    });

    it('wraps the provider error into a new Error with .cause set', async () => {
      const originalError = new Error('status boom');
      fakeProvider.handleStatus.mockRejectedValue(originalError);
      const providerOptions = { providerName: 'fakeProvider' };

      await expect(
        paymentService.handleStatus({}, providerOptions, 'x', {}, {}, false),
      ).rejects.toMatchObject({
        message: 'status boom',
        cause: originalError,
      });
      expect(global.log.save).toHaveBeenCalledWith(
        'handle-payment-status-on-provider-error',
        { error: originalError },
        'error',
      );
    });

    it('throws a wrapped Error (not the raw BadRequestError) for an unknown provider', async () => {
      const providerOptions = { providerName: 'unknownProvider' };

      const rejection = paymentService.handleStatus({}, providerOptions, 'x', {}, {}, false);
      await expect(rejection).rejects.toBeInstanceOf(Error);
      await expect(rejection).rejects.not.toBeInstanceOf(BadRequestError);
      await expect(rejection).rejects.toMatchObject({
        cause: expect.any(BadRequestError),
      });
    });
  });

  describe('confirmBySmsCode', () => {
    it('resolves with the provider result on the happy path', async () => {
      const providerOptions = { providerName: 'fakeProvider' };
      const calculatedData = { amount: 5 };
      const smsCode = '1234';
      const providerResult = { confirmed: true };
      fakeProvider.confirmBySmsCode.mockResolvedValue(providerResult);

      const result = await paymentService.confirmBySmsCode(providerOptions, calculatedData, smsCode);

      expect(result).toBe(providerResult);
      expect(fakeProvider.confirmBySmsCode).toHaveBeenCalledWith(providerOptions, calculatedData, smsCode);
      expect(global.log.save).toHaveBeenCalledWith(
        'confirm-payment-by-sms-code-result',
        { result: providerResult },
      );
    });

    it('rethrows the original error unmodified', async () => {
      const originalError = new Error('sms boom');
      fakeProvider.confirmBySmsCode.mockRejectedValue(originalError);
      const providerOptions = { providerName: 'fakeProvider' };

      await expect(
        paymentService.confirmBySmsCode(providerOptions, {}, '0000'),
      ).rejects.toBe(originalError);
      expect(global.log.save).toHaveBeenCalledWith(
        'confirm-payment-by-sms-code-error',
        { error: originalError },
        'error',
      );
    });

    it('throws a raw BadRequestError for an unknown provider', async () => {
      const providerOptions = { providerName: 'unknownProvider' };

      await expect(
        paymentService.confirmBySmsCode(providerOptions, {}, '0000'),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('cancelOrder', () => {
    it('resolves with the provider result on the happy path', async () => {
      const providerOptions = { providerName: 'fakeProvider' };
      const providerResult = { cancelled: true };
      fakeProvider.cancelOrder.mockResolvedValue(providerResult);

      const result = await paymentService.cancelOrder(providerOptions, 'order-1', 'txn-1', 'session-1');

      expect(result).toBe(providerResult);
      expect(fakeProvider.cancelOrder).toHaveBeenCalledWith(providerOptions, 'order-1', 'txn-1', 'session-1');
      expect(global.log.save).toHaveBeenCalledWith(
        'cancel-order-payment-service-result',
        { result: providerResult },
      );
    });

    it('rethrows the original error unmodified', async () => {
      const originalError = new Error('cancel boom');
      fakeProvider.cancelOrder.mockRejectedValue(originalError);
      const providerOptions = { providerName: 'fakeProvider' };

      await expect(
        paymentService.cancelOrder(providerOptions, 'order-1', 'txn-1', 'session-1'),
      ).rejects.toBe(originalError);
      expect(global.log.save).toHaveBeenCalledWith(
        'cancel-order-payment-service-error',
        { error: 'cancel boom' },
        'error',
      );
    });

    it('throws a raw BadRequestError for an unknown provider', async () => {
      const providerOptions = { providerName: 'unknownProvider' };

      await expect(
        paymentService.cancelOrder(providerOptions, 'order-1', 'txn-1', 'session-1'),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('unHoldPayment', () => {
    it('resolves with the provider result on the happy path, dispatching to unHoldOrder', async () => {
      const data = { paymentOptions: { providerName: 'fakeProvider' } };
      const providerResult = { unheld: true };
      fakeProvider.unHoldOrder.mockResolvedValue(providerResult);

      const result = await paymentService.unHoldPayment(data);

      expect(result).toBe(providerResult);
      expect(fakeProvider.unHoldOrder).toHaveBeenCalledWith(data);
      expect(global.log.save).toHaveBeenCalledWith(
        'unhold-payment-result',
        { result: providerResult },
      );
    });

    it('rethrows the original error unmodified', async () => {
      const originalError = new Error('unhold boom');
      fakeProvider.unHoldOrder.mockRejectedValue(originalError);
      const data = { paymentOptions: { providerName: 'fakeProvider' } };

      await expect(paymentService.unHoldPayment(data)).rejects.toBe(originalError);
      expect(global.log.save).toHaveBeenCalledWith(
        'unhold-payment-error',
        { error: originalError },
        'error',
      );
    });

    it('throws a raw BadRequestError for an unknown provider', async () => {
      const data = { paymentOptions: { providerName: 'unknownProvider' } };

      await expect(paymentService.unHoldPayment(data)).rejects.toThrow(BadRequestError);
    });
  });

  describe('checkStatus', () => {
    it('resolves with the provider result on the happy path', async () => {
      const providerOptions = { providerName: 'fakeProvider' };
      const providerResult = { status: 'checked' };
      fakeProvider.checkStatus.mockResolvedValue(providerResult);

      const result = await paymentService.checkStatus(providerOptions, 'session-1', 'invoice-1');

      expect(result).toBe(providerResult);
      expect(fakeProvider.checkStatus).toHaveBeenCalledWith(providerOptions, 'session-1', 'invoice-1');
      expect(global.log.save).toHaveBeenCalledWith(
        'cancel-payment-result',
        { result: providerResult },
      );
    });

    it('rethrows the original error unmodified', async () => {
      const originalError = new Error('check boom');
      fakeProvider.checkStatus.mockRejectedValue(originalError);
      const providerOptions = { providerName: 'fakeProvider' };

      await expect(
        paymentService.checkStatus(providerOptions, 'session-1', 'invoice-1'),
      ).rejects.toBe(originalError);
      expect(global.log.save).toHaveBeenCalledWith(
        'cancel-payment-error',
        { error: originalError },
        'error',
      );
    });

    it('throws a raw BadRequestError for an unknown provider', async () => {
      const providerOptions = { providerName: 'unknownProvider' };

      await expect(
        paymentService.checkStatus(providerOptions, 'session-1', 'invoice-1'),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getPaymentReceiptInfo', () => {
    it('resolves with the provider result on the happy path', async () => {
      const providerOptions = { providerName: 'fakeProvider' };
      const providerResult = { receipt: 'info' };
      fakeProvider.getPaymentReceiptInfo.mockResolvedValue(providerResult);

      const result = await paymentService.getPaymentReceiptInfo(providerOptions, 'order-1');

      expect(result).toBe(providerResult);
      expect(fakeProvider.getPaymentReceiptInfo).toHaveBeenCalledWith({
        paymentSystemParams: providerOptions,
        orderId: 'order-1',
      });
      expect(global.log.save).toHaveBeenCalledWith(
        'get-payment-receipt-info-result',
        { result: providerResult },
      );
    });

    it('rethrows the original error unmodified', async () => {
      const originalError = new Error('receipt info boom');
      fakeProvider.getPaymentReceiptInfo.mockRejectedValue(originalError);
      const providerOptions = { providerName: 'fakeProvider' };

      await expect(
        paymentService.getPaymentReceiptInfo(providerOptions, 'order-1'),
      ).rejects.toBe(originalError);
      expect(global.log.save).toHaveBeenCalledWith(
        'get-payment-receipt-info-error',
        { error: 'receipt info boom' },
        'error',
      );
    });

    it('throws a raw BadRequestError for an unknown provider', async () => {
      const providerOptions = { providerName: 'unknownProvider' };

      await expect(
        paymentService.getPaymentReceiptInfo(providerOptions, 'order-1'),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getPaymentReceiptFiles', () => {
    it('resolves with the provider result on the happy path', async () => {
      const providerOptions = { providerName: 'fakeProvider' };
      const paymentControlSchema = { schema: true };
      const providerResult = [{ fileBuffer: Buffer.from('abc'), contentType: 'application/pdf' }];
      fakeProvider.getPaymentReceiptFiles.mockResolvedValue(providerResult);

      const result = await paymentService.getPaymentReceiptFiles(providerOptions, 'order-1', 'pdf', paymentControlSchema);

      expect(result).toBe(providerResult);
      expect(fakeProvider.getPaymentReceiptFiles).toHaveBeenCalledWith({
        paymentSystemParams: providerOptions,
        orderId: 'order-1',
        receiptFormat: 'pdf',
        paymentControlSchema,
      });
      expect(global.log.save).toHaveBeenCalledWith(
        'get-payment-receipt-result',
        {
          result: [
            {
              fileBuffer: '****',
              contentType: 'application/pdf',
              fileBufferLength: providerResult[0].fileBuffer.length,
            },
          ],
        },
      );
    });

    it('rethrows the original error unmodified', async () => {
      const originalError = new Error('receipt files boom');
      fakeProvider.getPaymentReceiptFiles.mockRejectedValue(originalError);
      const providerOptions = { providerName: 'fakeProvider' };

      await expect(
        paymentService.getPaymentReceiptFiles(providerOptions, 'order-1', 'pdf', {}),
      ).rejects.toBe(originalError);
      expect(global.log.save).toHaveBeenCalledWith(
        'get-payment-receipt-error',
        { error: 'receipt files boom' },
        'error',
      );
    });

    it('throws a raw BadRequestError for an unknown provider', async () => {
      const providerOptions = { providerName: 'unknownProvider' };

      await expect(
        paymentService.getPaymentReceiptFiles(providerOptions, 'order-1', 'pdf', {}),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getWithdrawalFundsStatus', () => {
    it('resolves with the provider result on the happy path', async () => {
      const providerOptions = { providerName: 'fakeProvider' };
      const providerResult = { withdrawalStatus: 'done' };
      fakeProvider.getWithdrawalFundsStatus.mockResolvedValue(providerResult);

      const result = await paymentService.getWithdrawalFundsStatus(providerOptions, 'order-1');

      expect(result).toBe(providerResult);
      expect(fakeProvider.getWithdrawalFundsStatus).toHaveBeenCalledWith({
        paymentSystemParams: providerOptions,
        orderId: 'order-1',
      });
      expect(global.log.save).toHaveBeenCalledWith(
        'get-withdrawal-status-provider-result',
        { result: providerResult },
      );
    });

    it('rethrows the original error unmodified', async () => {
      const originalError = new Error('withdrawal boom');
      fakeProvider.getWithdrawalFundsStatus.mockRejectedValue(originalError);
      const providerOptions = { providerName: 'fakeProvider' };

      await expect(
        paymentService.getWithdrawalFundsStatus(providerOptions, 'order-1'),
      ).rejects.toBe(originalError);
      expect(global.log.save).toHaveBeenCalledWith(
        'get-withdrawal-status-provider-error',
        { error: originalError },
        'error',
      );
    });

    it('throws a raw BadRequestError for an unknown provider', async () => {
      const providerOptions = { providerName: 'unknownProvider' };

      await expect(
        paymentService.getWithdrawalFundsStatus(providerOptions, 'order-1'),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('sendCheckRequest', () => {
    it('resolves with the provider result on the happy path', async () => {
      const providerOptions = { providerName: 'fakeProvider' };
      const providerResult = { checkSent: true };
      fakeProvider.sendCheckRequest.mockResolvedValue(providerResult);

      const result = await paymentService.sendCheckRequest(providerOptions);

      expect(result).toBe(providerResult);
      expect(fakeProvider.sendCheckRequest).toHaveBeenCalledWith(providerOptions);
      expect(global.log.save).toHaveBeenCalledWith(
        'send-check-request-result',
        { result: providerResult },
      );
    });

    it('rethrows the original error unmodified', async () => {
      const originalError = new Error('send check boom');
      fakeProvider.sendCheckRequest.mockRejectedValue(originalError);
      const providerOptions = { providerName: 'fakeProvider' };

      await expect(
        paymentService.sendCheckRequest(providerOptions),
      ).rejects.toBe(originalError);
      expect(global.log.save).toHaveBeenCalledWith(
        'send-check-request-error',
        { error: originalError },
        'error',
      );
    });

    it('throws a raw BadRequestError for an unknown provider', async () => {
      const providerOptions = { providerName: 'unknownProvider' };

      await expect(
        paymentService.sendCheckRequest(providerOptions),
      ).rejects.toThrow(BadRequestError);
    });
  });
});
