import { Readable } from 'stream';

import { PaymentController } from './payment';

jest.mock('../businesses/document', () => ({ DocumentBusiness: jest.fn() }));
jest.mock('../models/payment_logs', () => ({ PaymentLogsModel: jest.fn() }));

describe('PaymentController.handleStatus', () => {
  let controller: PaymentController;
  let handlePaymentStatus: jest.Mock;
  let responseError: jest.SpyInstance;

  const createReq = (body: string): any => {
    const req: any = Readable.from([Buffer.from(body)]);
    req.headers = {};
    req.params = { customer: 'liqpay', status: 'status' };
    req.query = {};
    req.url = '/payment/liqpay/status';
    return req;
  };

  beforeEach(() => {
    (global as any).log = { save: jest.fn() };
    (global as any).config = {};
    controller = Object.create(PaymentController.prototype);
    (controller as any).config = { server: { maxBodySize: '1kb' }, payment: {} };
    handlePaymentStatus = jest.fn().mockResolvedValue({ transactionId: 't1' });
    controller.documentBusiness = { payment: { handlePaymentStatus } } as any;
    controller.paymentLogsModel = { save: jest.fn().mockResolvedValue(true) } as any;
    responseError = jest.spyOn(controller, 'responseError').mockImplementation(async () => undefined as any);
    jest.spyOn(controller, 'responseData').mockImplementation(() => undefined as any);
    jest.spyOn(controller, 'redirect').mockImplementation(() => undefined as any);
  });

  it('should respond with 413 and not process an oversize body', async () => {
    await controller.handleStatus(createReq('x'.repeat(2048)), {} as any);

    expect(responseError).toHaveBeenCalledWith(expect.anything(), expect.any(String), 413);
    expect(handlePaymentStatus).not.toHaveBeenCalled();
    expect(controller.paymentLogsModel.save).not.toHaveBeenCalled();
  });

  it('should process a body within the limit', async () => {
    await controller.handleStatus(createReq('data=abc'), {} as any);

    expect(handlePaymentStatus).toHaveBeenCalledWith('data=abc', 'liqpay', 'status', {}, {});
    expect(responseError).not.toHaveBeenCalled();
  });
});
