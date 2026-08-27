import type { TaskPaymentData } from "@liquio/plugin-sdk";

/**
 * Configuration options for {@link PayoneProvider}.
 * These come from the per-customer plugin config (`plugins.json`), not from code constants.
 */
export interface PayoneOptions {
  /** PAYONE Commerce Platform API key. */
  apiKey: string;
  /** PAYONE Commerce Platform API secret. */
  apiSecret: string;
  /** Base URL of the PAYONE Commerce Platform API, e.g. `https://api.preprod.commerce.payone.com`. */
  baseUrl: string;
  /** PAYONE merchant ID the commerce case/checkout is created under. */
  merchantId: string;
  /**
   * ID of the specific redirect payment product to use (e.g. a specific bank/wallet product
   * from PAYONE's product catalog). Not enumerated by the SDK - it's merchant/config-specific,
   * so it must be configurable per deployment rather than hardcoded.
   */
  paymentProductId: number;
  /**
   * Fallback return URL PAYONE redirects the customer back to after completing (or abandoning)
   * the hosted payment page, used when the resolved payment data passed to `calculatePayment`
   * doesn't carry its own return URL.
   */
  defaultRedirectUrl: string;
  /**
   * Default ISO currency code (e.g. `UAH`, `EUR`) used when the resolved payment data passed to
   * `calculatePayment` doesn't carry one. NOTE (real gap found while wiring this up):
   * `document.ts`'s `resolvePaymentAmount`/the former `Provider.getPaymentAmount` only ever
   * resolve `{ recipient, amount, description, orderId, payer, orderIdSuffix, orderNum }` from
   * JSON-schema formulas - there is no `currency` formula anywhere in that resolution path. So
   * this option is not speculative; it plugs an actual missing piece of the resolved payload
   * (currency has to come from somewhere per-deployment, since PAYONE requires it).
   */
  defaultCurrency: string;
}

/**
 * Resolved payment data shape that `components/task`'s `document.ts` passes through
 * `PaymentService.calculatePayment` into `PayoneProvider#calculatePayment`.
 *
 * `document.ts`'s `resolvePaymentAmount` evaluates the JSON-schema payment formulas
 * (amount/description/orderId/etc.) against the document *before* calling the provider, so by
 * the time this plugin sees the data it's already plain resolved values - the plugin does not
 * (and must not) perform any Sandbox/JSON-schema formula evaluation itself.
 *
 * `amount` here is a plain, formula-evaluated decimal currency amount (e.g. `100.5` for
 * "100.50 UAH"), NOT PAYONE's integer-cents `AmountOfMoney.amount` - confirmed via
 * `Provider.parseAmount`'s existing behavior (`parseAmount('12,50') === 12.5`), which is the
 * established convention for these resolved amounts elsewhere in `components/task`. The
 * provider is responsible for converting to integer cents before calling the PAYONE SDK.
 */
export interface PayoneResolvedPaymentData extends TaskPaymentData {
  /** Resolved decimal currency amount (not cents). */
  amount: number;
  /** ISO currency code, e.g. `UAH`/`EUR`. Falls back to a provider-level default if absent. */
  currency?: string;
  /** Human-readable payment description. */
  description?: string;
  /** Merchant-facing order identifier, used as the PAYONE `merchantReference`. */
  orderId: string;
  /** Return URL to send the customer back to after completing payment on PAYONE's hosted page. */
  returnUrl?: string;
}

/**
 * Shape returned by {@link PayoneProvider#handleStatus}, matching the contract
 * `components/task/src/businesses/document.ts#handlePaymentStatus` requires: it destructures
 * `{ documentId, paymentControlPath, extraData, transactionId }`, later reads
 * `statusInfo.status.isSuccess` and pushes `statusInfo` verbatim into the document's
 * processed-payment-history array.
 */
export interface PayoneStatusInfo {
  /** Which document this payment belongs to. */
  documentId: string;
  paymentControlPath: string;
  transactionId: string;
  status: {
    isSuccess: boolean;
  };
  extraData: {
    order_id?: string;
    [key: string]: unknown;
  };
}

/** Shape returned by {@link PayoneProvider#calculatePayment}. */
export interface PayoneCalculatedPaymentData {
  /** URL to redirect the customer to in order to complete payment on PAYONE's hosted page. */
  redirectUrl: string;
  /** PAYONE's commerce case ID - needed to look up/reconcile this payment later. */
  commerceCaseId?: string;
  /** PAYONE's checkout ID - needed to look up/reconcile this payment later. */
  checkoutId?: string;
  /** PAYONE's payment execution ID, if present in the response. */
  paymentExecutionId?: string;
  /** Merchant reference sent as `orderId` (echoed back for correlation). */
  orderId: string;
  /** Amount, echoed back in the original decimal currency unit (not cents). */
  amount: number;
  /** Currency code used for the payment. */
  currency: string;
}
