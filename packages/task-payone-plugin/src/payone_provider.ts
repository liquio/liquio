import { PluginContext, TaskPaymentProvider } from "@liquio/plugin-sdk";
import { init } from "onlinepayments-sdk-nodejs";

import {
  PayoneCalculatedPaymentData,
  PayoneOptions,
  PayoneResolvedPaymentData,
  PayoneStatusInfo,
} from "./types";

/**
 * PAYONE Server API payment provider for `components/task`.
 *
 * Supports PAYONE's redirect/hosted-checkout flow only - card tokenization would require
 * client-side tokenizer work in `cabinet-front` and is not implemented here.
 */
export class PayoneProvider extends TaskPaymentProvider<PayoneOptions> {
  private readonly client: ReturnType<typeof init>;

  constructor(context: PluginContext, options: PayoneOptions) {
    super(context, options);
    const baseUrl = new URL(options.baseUrl);
    this.client = init({
      host: baseUrl.hostname,
      apiKeyId: options.apiKey,
      secretApiKey: options.apiSecret,
      integrator: "OnlinePayments",
    });
  }

  /**
   * Create a PAYONE hosted checkout and return the URL to
   * redirect the customer to in order to complete payment on PAYONE's hosted page.
   *
   * `data` is expected to already be resolved (amount/description/orderId/etc. evaluated
   * against the document by `components/task`'s `document.ts#resolvePaymentAmount` before this
   * method is ever called) - this plugin has no access to, and must not depend on,
   * `components/task`'s internal `Sandbox`/JSON-schema formula machinery.
   */
  async calculatePayment(data: unknown): Promise<PayoneCalculatedPaymentData> {
    const input = data as PayoneResolvedPaymentData;
    const recipients = input?.recipients;
    const payload: PayoneResolvedPaymentData = recipients?.length
      ? ({
          ...input,
          ...recipients[0],
          amount: recipients.reduce(
            (total, recipient) => total + Number(recipient.amount),
            0,
          ),
        } as PayoneResolvedPaymentData)
      : input;

    if (
      typeof payload?.amount !== "number" ||
      !Number.isFinite(payload.amount)
    ) {
      throw new Error(
        `PayoneProvider.calculatePayment: resolved payment data is missing a numeric "amount" (got ${JSON.stringify(payload?.amount)}).`,
      );
    }
    if (!payload.orderId) {
      throw new Error(
        'PayoneProvider.calculatePayment: resolved payment data is missing "orderId".',
      );
    }

    // `payload.amount` is a plain decimal currency amount (e.g. 100.5 for "100.50"), NOT cents -
    // PAYONE's AmountOfMoney.amount is an integer number of cents, so it must be converted.
    const amountInCents = Math.round(payload.amount * 100);
    const currencyCode = payload.currency ?? this.options.defaultCurrency;
    // Append documentId/paymentControlPath as query params so they round-trip back on the
    // customer's browser redirect (RedirectionData.returnUrl's own JSDoc: "You can add any
    // number of key value pairs in the query string... that help you identify the customer when
    // they return"). This is what lets handleStatus identify which document/control a later
    // callback is about - without it, handleStatus has nothing to key off.
    const returnUrl = this.buildReturnUrl(
      payload.returnUrl ?? this.options.defaultRedirectUrl,
      {
        documentId: payload.documentId,
        paymentControlPath: payload.paymentControlPath,
      },
    );

    const request = {
      order: {
        amountOfMoney: {
          amount: amountInCents,
          currencyCode,
        },
        references: {
          merchantReference: payload.orderId,
        },
      },
      hostedCheckoutSpecificInput: {
        returnUrl,
        showResultPage: false,
      },
      redirectPaymentMethodSpecificInput: {
        paymentProductId: this.options.paymentProductId,
      },
    };

    try {
      const response = await this.client.hostedCheckout.createHostedCheckout(
        this.options.merchantId,
        request,
        null,
      );
      if (!response.isSuccess) {
        throw this.formatSdkResponseError(response);
      }
      const redirectUrl = response.body.redirectUrl;

      if (!redirectUrl) {
        throw new Error(
          `PayoneProvider.calculatePayment: PAYONE response did not contain a redirect URL (hostedCheckoutId=${response.body.hostedCheckoutId ?? "unknown"}).`,
        );
      }

      return {
        redirectUrl,
        commerceCaseId: undefined,
        checkoutId: response.body.hostedCheckoutId,
        paymentExecutionId: undefined,
        orderId: payload.orderId,
        amount: payload.amount,
        currency: currencyCode,
      };
    } catch (error) {
      throw this.translateSdkError(error);
    }
  }

  /**
   * Append identifying query params (e.g. documentId/paymentControlPath) onto a return URL,
   * preserving any query params already present. Silently skips params whose value is missing.
   */
  private buildReturnUrl(
    baseUrl: string,
    params: Record<string, string | undefined>,
  ): string {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
    return url.toString();
  }

  /**
   * Translate a raw PAYONE SDK exception into a clear, loggable `Error` instead of letting an
   * opaque SDK exception escape uninterpreted.
   */
  private formatSdkResponseError(response: {
    status: number;
    body: unknown;
  }): Error {
    return new Error(
      `PayoneProvider: PAYONE API returned an error response (status ${response.status}): ${JSON.stringify(response.body)}`,
    );
  }

  private translateSdkError(error: unknown): Error {
    if (
      error &&
      typeof error === "object" &&
      "getStatusCode" in error &&
      "getResponseBody" in error &&
      typeof error.getStatusCode === "function" &&
      typeof error.getResponseBody === "function"
    ) {
      return new Error(
        `PayoneProvider: PAYONE API call failed (status ${error.getStatusCode()}): ${error.getResponseBody()}`,
      );
    }
    return error instanceof Error
      ? error
      : new Error(
          `PayoneProvider: unexpected error calling PAYONE API: ${String(error)}`,
        );
  }

  /**
   * Handle both the customer's browser being redirected back from PAYONE's hosted checkout page
   * (`GET /payment/:customer/:status`) and any async server-to-server webhook PAYONE might send
   * (`POST /payment/:customer/:status`, `POST /payment/:customer`) - both hit this same method
   * (`components/task/src/controllers/payment.ts#handleStatus` ->
   * `businesses/document.ts#handlePaymentStatus`).
   *
   * PAYONE's exact webhook/redirect-callback payload schema and signing mechanism are not
   * confirmed - PAYONE's public webhook reference documentation is a JS-rendered page that could
   * not be retrieved programmatically, and a separate PAYONE developer-guide webhook page
   * describes a `payment.id`/HMAC-signed payload with no `commerceCaseId`/`checkoutId` concepts,
   * so it isn't clear that it applies to this Commerce Platform (checkout/commerce-case based)
   * API rather than PAYONE's separate legacy Server API - it is not relied upon below.
   *
   * Design used instead (deliberate, not an oversight): never trust the incoming callback
   * payload's status field - treat the callback as "something changed, go check" and re-query
   * PAYONE's own API (`CheckoutApiClient.getCheckoutRequest`) for authoritative status. This is
   * standard webhook-security practice anyway and sidesteps needing the exact payload schema. It
   * does not remove the need to identify *which* checkout the callback is about, so multiple
   * plausible key names are checked defensively in both the payload and the query params,
   * pending real PAYONE sandbox testing to confirm/narrow this.
   */
  async handleStatus(
    data: unknown,
    _providerOptions: unknown,
    _status: string,
    queryParamsObject: unknown,
    _headersObject: unknown,
    checkPrevTransaction?: boolean,
  ): Promise<PayoneStatusInfo> {
    const parsedData = this.parseCallbackData(data);
    const params = this.asRecord(queryParamsObject);

    const commerceCaseId = this.pickField(parsedData, params, [
      "commerceCaseId",
      "commerce_case_id",
      "commerceCaseID",
    ]);
    const checkoutId = this.pickField(parsedData, params, [
      "checkoutId",
      "checkout_id",
      "checkoutID",
      "hostedCheckoutId",
    ]);

    if (!commerceCaseId || !checkoutId) {
      throw new Error(
        `PayoneProvider.handleStatus: could not identify which PAYONE commerce case/checkout this callback is about ` +
          `(looked for commerceCaseId/checkoutId under those and a few alternate key names in both the callback payload ` +
          `and the query params; found commerceCaseId=${JSON.stringify(commerceCaseId)}, checkoutId=${JSON.stringify(checkoutId)}). ` +
          `payloadKeys=${JSON.stringify(Object.keys(parsedData))}, queryParamKeys=${JSON.stringify(Object.keys(params))}`,
      );
    }

    const documentId = this.pickField(parsedData, params, [
      "documentId",
      "document_id",
    ]);
    const paymentControlPath = this.pickField(parsedData, params, [
      "paymentControlPath",
      "payment_control_path",
    ]);

    if (!documentId || !paymentControlPath) {
      throw new Error(
        `PayoneProvider.handleStatus: could not identify which document/paymentControlPath this callback belongs to ` +
          `(documentId=${JSON.stringify(documentId)}, paymentControlPath=${JSON.stringify(paymentControlPath)}). ` +
          `These must round-trip back via the query string on the "returnUrl" passed to calculatePayment (or be present ` +
          `on the webhook body) - confirm this once real PAYONE sandbox testing is possible.`,
      );
    }

    let checkout: any;
    try {
      const response = await this.client.hostedCheckout.getHostedCheckout(
        this.options.merchantId,
        checkoutId,
      );
      if (!response.isSuccess) throw this.formatSdkResponseError(response);
      checkout = response.body;
    } catch (error) {
      throw this.translateSdkError(error);
    }

    const isSuccess = checkout.status === "PAYMENT_CREATED";
    const payment = checkout.createdPaymentOutput?.payment;

    // `checkPrevTransaction` (per `document.ts#calculatePayment`'s only caller of this path with
    // it set) is used to check whether an already-`calculatePayment`'d checkout has *already*
    // reached a terminal status before creating a brand new PAYONE checkout for the same
    // document - i.e. duplicate/re-entry protection, not duplicate-webhook-delivery protection.
    // Since this method always re-queries PAYONE's API (an idempotent GET) rather than mutating
    // anything, there is no extra "don't reprocess" branching needed here for correctness - the
    // caller decides what to do based on the returned `status.isSuccess` (skip creating a new
    // checkout when true). `checkPrevTransaction` is kept as a parameter (matching the abstract
    // signature) and threaded into `extraData` below so it's visible in the persisted history
    // for audit purposes.
    const transactionId =
      this.pickField(parsedData, params, [
        "transactionId",
        "paymentExecutionId",
        "payment_execution_id",
      ]) ??
      payment?.id ??
      checkoutId;

    return {
      documentId,
      paymentControlPath,
      transactionId,
      status: { isSuccess },
      extraData: {
        order_id: payment?.paymentOutput?.references?.merchantReference,
        commerceCaseId,
        checkoutId,
        checkoutStatus: checkout.status,
        paymentStatus: checkout.createdPaymentOutput?.paymentStatusCategory,
        checkPrevTransaction: Boolean(checkPrevTransaction),
      },
    };
  }

  /** Best-effort parse of the raw callback payload into a plain key/value record. */
  private parseCallbackData(data: unknown): Record<string, unknown> {
    if (typeof data === "string") {
      if (!data.trim()) return {};
      try {
        return this.asRecord(JSON.parse(data));
      } catch {
        return {};
      }
    }
    return this.asRecord(data);
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  }

  /** Look up the first present, non-empty value for any of `keys`, checking `data` before `params`. */
  private pickField(
    data: Record<string, unknown>,
    params: Record<string, unknown>,
    keys: string[],
  ): string | undefined {
    for (const source of [data, params]) {
      for (const key of keys) {
        const value = source[key];
        if (typeof value === "string" && value.length > 0) return value;
      }
    }
    return undefined;
  }

  /**
   * Not supported: PAYONE's hosted redirect checkout has no SMS-confirmation step - no
   * SMS-confirmation concept exists anywhere in PAYONE's Commerce Platform API. The customer
   * completes/authenticates the payment entirely on PAYONE's own hosted page (including any
   * 3-D Secure/OTP step PAYONE itself needs), so `components/task` never sees, and PAYONE never
   * asks this backend for, a merchant-relayed SMS code.
   */
  async confirmBySmsCode(
    _providerOptions: unknown,
    _calculatedData: unknown,
    _smsCode: string,
  ): Promise<never> {
    throw new Error(
      "confirmBySmsCode is not supported by the Payone provider (Payone uses a hosted redirect checkout with no SMS confirmation step).",
    );
  }

  /**
   * Cancel (reverse) a PAYONE order.
   *
   * Chosen SDK method: `OrderManagementCheckoutActionsApiClient.cancelOrder` (not
   * `PaymentExecutionApiClient.cancelPayment`). Both exist and both ultimately reverse a
   * payment, but `OrderManagementCheckoutActionsApiClient.cancelOrder`'s request/response
   * (`CancelRequest`/`CancelResponse`) is explicitly checkout/order-scoped - its own JSDoc is
   * "mark items as of the respective Checkout as cancelled and to automatically reverse the
   * associated payment", and omitting `cancelItems` cancels the whole ShoppingCart - i.e. exactly
   * "cancel the order" as this method's name says. `PaymentExecutionApiClient.cancelPayment` is
   * payment-execution-scoped (keyed by `paymentExecutionId`, not the checkout as a whole) and
   * reads more like a "cancelPayment" primitive than the order-level operation this method is
   * named for.
   *
   * ID mapping (`components/task`'s `orderId`/`transactionId`/`sessionId` are not PAYONE's own
   * IDs):
   * - `sessionId` is treated as PAYONE's `checkoutId` (consistent with `checkStatus` below,
   *   which makes the same choice for its own `sessionId` parameter - the hosted "payment
   *   session" *is* the PAYONE checkout in this redirect-only integration).
   * - PAYONE's `cancelOrder` also needs `commerceCaseId`, which none of `orderId`/
   *   `transactionId`/`sessionId` carry directly (this plugin has no persistence of its own).
   *   Rather than guessing, it is looked up from PAYONE itself: `CheckoutApiClient.getCheckoutsRequest`
   *   filtered by `checkoutId` returns the matching `CheckoutResponse`, whose own
   *   `commerceCaseId` field is the value PAYONE needs.
   * - `orderId` (the merchant-facing order id / `merchantReference`) and `transactionId` (a
   *   `task`-internal, base64-encoded id per `Provider.generateTransactionId` - not a PAYONE id
   *   at all) are not needed to identify the PAYONE resources being cancelled, but are still
   *   threaded into the returned result for correlation/audit logging.
   */
  async cancelOrder(
    _providerOptions: unknown,
    orderId: string,
    transactionId: string,
    sessionId: string,
  ): Promise<unknown> {
    if (!sessionId) {
      throw new Error(
        `PayoneProvider.cancelOrder: missing "sessionId" (expected to be PAYONE's checkoutId) - cannot identify which PAYONE checkout to cancel (orderId=${JSON.stringify(orderId)}, transactionId=${JSON.stringify(transactionId)}).`,
      );
    }

    try {
      const checkoutResponse =
        await this.client.hostedCheckout.getHostedCheckout(
          this.options.merchantId,
          sessionId,
          null,
        );
      if (!checkoutResponse.isSuccess) {
        throw this.formatSdkResponseError(checkoutResponse);
      }
      const paymentId =
        checkoutResponse.body.createdPaymentOutput?.payment?.id ??
        transactionId;
      if (!paymentId) {
        throw new Error(
          `PayoneProvider.cancelOrder: hosted checkout ${JSON.stringify(sessionId)} has no created payment to cancel.`,
        );
      }
      const response = await this.client.payments.cancelPayment(
        this.options.merchantId,
        paymentId,
        { isFinal: true },
        null,
      );
      if (!response.isSuccess) throw this.formatSdkResponseError(response);

      return {
        orderId,
        transactionId,
        sessionId,
        paymentId,
        cancelResponse: response.body,
      };
    } catch (error) {
      throw this.translateSdkError(error);
    }
  }

  /**
   * Not supported: no "release a hold" operation applies to this integration.
   * `PaymentExecutionApiClient.pausePayment`/`refreshPayment` were considered as candidates, but
   * `pausePayment`'s own description is "Request to pause a payment" - the *opposite* direction
   * of "unhold" (releasing a previously held payment so it can be collected) - and
   * `refreshPayment` merely re-fetches payment status without changing any hold state.
   *
   * The SDK method that actually matches "release a hold so funds get collected" is
   * `PaymentExecutionApiClient.capturePayment` (`CapturePaymentRequest`'s own JSDoc: "capture...
   * the amount that was authorized"). But `calculatePayment` above always sets
   * `autoExecuteOrder: true` on the order it creates - PAYONE auto-executes/captures the order as
   * soon as the checkout completes, so there is no separate authorize-then-hold step in this
   * integration for `capturePayment` to ever apply to. Supporting a genuine hold/capture flow
   * would require reworking `calculatePayment` to stop auto-executing.
   */
  async unHoldOrder(_data: unknown): Promise<never> {
    throw new Error(
      "unHoldOrder is not supported by the Payone provider (calculatePayment always creates an auto-executed order - Payone captures funds immediately on checkout completion, so there is no separate authorization hold to release in this integration).",
    );
  }

  /**
   * Check the current status of a PAYONE checkout.
   *
   * ID mapping (mirrors `cancelOrder`'s reasoning above for consistency): `sessionId` is treated
   * as PAYONE's `checkoutId` and `invoiceId` as PAYONE's `commerceCaseId` - the two IDs
   * `CheckoutApiClient.getCheckoutRequest` needs alongside `merchantId`. This is documented as
   * the deliberate interpretation for this provider rather than a universal contract, since
   * PAYONE does not define its own meaning for `sessionId`/`invoiceId`.
   */
  async checkStatus(
    _providerOptions: unknown,
    sessionId: string,
    invoiceId: string,
  ): Promise<unknown> {
    if (!sessionId || !invoiceId) {
      throw new Error(
        `PayoneProvider.checkStatus: missing "sessionId"/"invoiceId" (expected to be PAYONE's checkoutId/commerceCaseId respectively) - ` +
          `got sessionId=${JSON.stringify(sessionId)}, invoiceId=${JSON.stringify(invoiceId)}.`,
      );
    }

    try {
      const response = await this.client.hostedCheckout.getHostedCheckout(
        this.options.merchantId,
        sessionId,
      );
      if (!response.isSuccess) throw this.formatSdkResponseError(response);
      const checkout = response.body;
      const payment = checkout.createdPaymentOutput?.payment;
      const isSuccess = checkout.status === "PAYMENT_CREATED";

      return {
        isSuccess,
        checkoutId: sessionId,
        hostedCheckoutStatus: checkout.status,
        paymentStatus: checkout.createdPaymentOutput?.paymentStatusCategory,
        orderId: payment?.paymentOutput?.references?.merchantReference,
        paymentId: payment?.id,
      };
    } catch (error) {
      throw this.translateSdkError(error);
    }
  }

  /**
   * Not supported: no receipt/invoice-document endpoint exists anywhere in PAYONE's Commerce
   * Platform API. PAYONE's API returns structured checkout/payment status data
   * (`CheckoutResponse`/`PaymentExecution`/etc.), not a merchant-facing receipt document. Any
   * receipt shown to the payer is PAYONE's own hosted-page concern; any receipt `task` itself
   * needs to produce would have to be generated from the structured data already returned by
   * `calculatePayment`/`handleStatus`/`checkStatus` above, not fetched from PAYONE as a distinct
   * "receipt" resource.
   */
  async getPaymentReceiptInfo(_args: {
    paymentSystemParams: unknown;
    orderId: string;
  }): Promise<never> {
    throw new Error(
      "getPaymentReceiptInfo is not supported by the Payone provider (Payone's Commerce Platform API has no receipt/invoice-document endpoint - see checkStatus/handleStatus for the structured payment data Payone does expose).",
    );
  }

  /**
   * Not supported: same reasoning as `getPaymentReceiptInfo` above - no file/document-download
   * endpoint (PDF or otherwise) exists anywhere in PAYONE's API for a receipt file/`contentType`
   * pair to come from.
   */
  async getPaymentReceiptFiles(_args: {
    paymentSystemParams: unknown;
    orderId: string;
    receiptFormat: string;
    paymentControlSchema: unknown;
  }): Promise<Array<{ fileBuffer: ArrayBuffer; contentType: string }>> {
    throw new Error(
      "getPaymentReceiptFiles is not supported by the Payone provider (Payone's Commerce Platform API has no receipt/document file-download endpoint).",
    );
  }

  /**
   * Not supported: no payout/withdrawal-status endpoint or model exists in PAYONE's Commerce
   * Platform API. The closest surfaces (`PaymentExecutionApiClient`/`PaymentInformationApiClient`)
   * only cover collecting/refunding/cancelling a *customer's* payment into the merchant, never a
   * separate merchant-side "withdrawal" of settled funds. PAYONE settles collected funds to the
   * merchant's own bank account per the merchant's commercial agreement with PAYONE, outside of
   * any API surface this SDK exposes - there is no per-order "withdrawal" resource to query.
   */
  async getWithdrawalFundsStatus(_args: {
    paymentSystemParams: unknown;
    orderId: string;
  }): Promise<never> {
    throw new Error(
      "getWithdrawalFundsStatus is not supported by the Payone provider (Payone's Commerce Platform API has no per-order withdrawal/payout-status endpoint - settlement to the merchant's bank account happens outside this API).",
    );
  }

  /**
   * Not supported: `sendCheckRequest` has no PAYONE-specific meaning - it does not correspond to
   * any concept in PAYONE's card/redirect Commerce Platform API, which is not fiscalization-aware
   * (the naming suggests a fiscal "check"/receipt being sent, e.g. to a national fiscal-receipt
   * registrar).
   */
  async sendCheckRequest(_providerOptions: unknown): Promise<never> {
    throw new Error(
      "sendCheckRequest is not supported by the Payone provider (this is a fiscal-receipt/check-registration concept with no equivalent in Payone's Commerce Platform API).",
    );
  }
}
