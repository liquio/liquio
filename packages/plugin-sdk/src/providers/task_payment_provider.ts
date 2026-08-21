import { BasePlugin } from "./base_provider";

export abstract class TaskPaymentProvider<
  TOptions = Record<string, unknown>,
> extends BasePlugin<TOptions> {
  abstract calculatePayment(data: unknown): Promise<unknown>;

  abstract handleStatus(
    data: unknown,
    providerOptions: unknown,
    status: string,
    queryParamsObject: unknown,
    headersObject: unknown,
    checkPrevTransaction?: boolean,
  ): Promise<unknown>;

  abstract confirmBySmsCode(
    providerOptions: unknown,
    calculatedData: unknown,
    smsCode: string,
  ): Promise<unknown>;

  abstract cancelOrder(
    providerOptions: unknown,
    orderId: string,
    transactionId: string,
    sessionId: string,
  ): Promise<unknown>;

  abstract unHoldOrder(data: unknown): Promise<unknown>;

  abstract checkStatus(
    providerOptions: unknown,
    sessionId: string,
    invoiceId: string,
  ): Promise<unknown>;

  abstract getPaymentReceiptInfo(args: {
    paymentSystemParams: unknown;
    orderId: string;
  }): Promise<unknown>;

  abstract getPaymentReceiptFiles(args: {
    paymentSystemParams: unknown;
    orderId: string;
    receiptFormat: string;
    paymentControlSchema: unknown;
  }): Promise<Array<{ fileBuffer: ArrayBuffer; contentType: string }>>;

  abstract getWithdrawalFundsStatus(args: {
    paymentSystemParams: unknown;
    orderId: string;
  }): Promise<unknown>;

  abstract sendCheckRequest(providerOptions: unknown): Promise<unknown>;
}
