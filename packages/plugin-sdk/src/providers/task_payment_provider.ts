import { BasePlugin } from "./base_provider";

export interface TaskPaymentRecipient {
  amount: number;
  currency?: string;
  description?: string;
  orderId?: string;
  recipient?: string;
  payer?: string;
  orderIdSuffix?: string;
  orderNum?: number;
  [key: string]: unknown;
}

export interface TaskPaymentData {
  amount?: number;
  currency?: string;
  description?: string;
  orderId?: string;
  recipient?: string;
  payer?: string;
  orderIdSuffix?: string;
  orderNum?: number;
  recipients?: TaskPaymentRecipient[];
  documentId?: string;
  workflowId?: string;
  /**
   * The task this payment control lives on. Needed by a provider that redirects the customer to
   * an external page and must send them back to the right cabinet-front task URL afterwards
   * (there is no other way for a provider to resolve documentId -> taskId - `components/task`
   * resolves it once here since it already has the document loaded).
   */
  taskId?: string;
  paymentControlPath?: string;
  [key: string]: unknown;
}

/**
 * Return shape required from every provider's `calculatePayment`.
 *
 * `components/task` ships TWO frontend controls that both read this same object, with
 * different, non-overlapping field expectations - a provider that needs a redirect step
 * (hosted checkout, 3-D Secure, etc.) must populate both:
 *
 * - `payment.widget`/`payment.widget.new` (`PaymentWidget.js#parseResult`) unconditionally
 *   destructures `calculated.extraData.{user_action_required, user_action_url}` - `extraData`
 *   must always be present (even if `user_action_required` is `false`) or the widget throws.
 * - The legacy `payment` control (`Payment/index.js`) instead reads
 *   `calculated.paymentRequestData.{url, requestUrl}` (`parseResult`/`paymentAction`/
 *   `initPayment`'s `hasInitialized` check) - if this is absent, `componentDidUpdate` never
 *   sees a truthy `paymentRequestData` in state and keeps re-triggering `init()`/`initPayment()`
 *   in a tight loop, and since `hasInitialized` also depends on it, every iteration creates a
 *   brand-new payment session with the upstream provider instead of reusing the pending one.
 *
 * `transactionId` must also be present: `document.ts#handlePaymentStatus` looks up the matching
 * `calculatedHistory` entry via `entry.transactionId === statusInfo.transactionId`.
 */
export interface TaskCalculatedPaymentData {
  transactionId: string;
  extraData: {
    user_action_required?: boolean;
    user_action_url?: string;
    [key: string]: unknown;
  };
  paymentRequestData?: {
    url?: string;
    requestUrl?: string;
    method?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Return shape required from every provider's `handleStatus`, matching what
 * `document.ts#handlePaymentStatus` destructures (`documentId`, `paymentControlPath`,
 * `transactionId`, `extraData`) and reads (`status.isSuccess`).
 */
export interface TaskPaymentStatusInfo {
  documentId: string;
  paymentControlPath: string;
  transactionId: string;
  status: {
    isSuccess: boolean;
    [key: string]: unknown;
  };
  extraData: {
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Shape of the per-customer config `document.ts#handlePaymentStatus` passes as `providerOptions`
 * (sourced from `config/task/payment.json`'s entry for this customer) - not enforced by the
 * abstract `handleStatus` signature below (kept as `unknown` since customers may add arbitrary
 * provider-specific fields there too), but exported so a provider can cast to it.
 *
 * `document.ts#handlePaymentStatus` only redirects the browser when `doRedirect` is `true`
 * (`providerOptions.doRedirect ? Object.assign({ url: statusInfo.extraData.redirectUrl },
 * statusInfo) : ...`), reading the target URL from `statusInfo.extraData.redirectUrl` - which the
 * provider itself must set, typically by filling `{taskId}` (and other placeholders) into
 * `frontRedirectUrl` using the `taskId` that round-tripped through the callback (see
 * {@link TaskPaymentData.taskId}).
 */
export interface TaskPaymentProviderRuntimeOptions {
  providerName?: string;
  doRedirect?: boolean;
  /** Template for the cabinet-front URL to land the customer on, e.g. `"https://cabinet.example/tasks/{taskId}"`. */
  frontRedirectUrl?: string;
  notifyUrlShortResponse?: boolean;
  [key: string]: unknown;
}

export abstract class TaskPaymentProvider<
  TOptions = Record<string, unknown>,
> extends BasePlugin<TOptions> {
  abstract calculatePayment(
    data: TaskPaymentData,
  ): Promise<TaskCalculatedPaymentData>;

  abstract handleStatus(
    data: unknown,
    providerOptions: unknown,
    status: string,
    queryParamsObject: unknown,
    headersObject: unknown,
    checkPrevTransaction?: boolean,
  ): Promise<TaskPaymentStatusInfo>;

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
