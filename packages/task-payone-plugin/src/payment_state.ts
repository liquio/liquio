import type { Domain } from "onlinepayments-sdk-nodejs";

import { PayoneCheckoutStatus, PayonePaymentStatusCategory } from "./types";

interface PaymentState {
  status: { isSuccess: boolean; isPending: boolean; canRetry?: true };
  paymentStatus?: string | null;
  paymentStatusCode?: number | null;
  authenticationStatus?: string | null;
  eci?: string | null;
  liability?: string | null;
}

/** Interpret a fresh server-side checkout response, never browser callback fields.
 * Explicitly unavailable authentication is rejected by application policy and allows retry.
 * This policy does not reverse any authorization or capture reported by PAYONE.
 * https://developer.payone.com/en/integration/api-developer-guide/statuses
 */
export function paymentState(
  checkout: Domain.GetHostedCheckoutResponse,
  singlePaymentAttempt = false,
): PaymentState {
  const payment = checkout.createdPaymentOutput?.payment;
  const paymentStatus = payment?.status;
  const paymentStatusCode = payment?.statusOutput?.statusCode;
  const authentication =
    payment?.paymentOutput?.cardPaymentMethodSpecificOutput
      ?.threeDSecureResults;
  const authenticationUnavailable =
    authentication?.authenticationStatus === "U";
  const isSuccess =
    !authenticationUnavailable &&
    paymentStatus === "CAPTURED" &&
    paymentStatusCode === 9;
  // Require a terminal monetary outcome as well as a closed checkout. In particular,
  // a rejected capture can leave an authorization alive and must not allow a new charge.
  const isTerminalFailure =
    (paymentStatus === "REJECTED" && paymentStatusCode === 2) ||
    (paymentStatus === "CANCELLED" &&
      (paymentStatusCode === 1 || paymentStatusCode === 6));
  const canRetry =
    // Explicit policy exception: permit a new attempt after unavailable authentication,
    // even when PAYONE reports captured funds. No automatic refund is performed here.
    authenticationUnavailable ||
    (checkout.status === PayoneCheckoutStatus.CancelledByConsumer &&
      (!payment || isTerminalFailure)) ||
    (checkout.status === PayoneCheckoutStatus.PaymentCreated &&
      checkout.createdPaymentOutput?.paymentStatusCategory ===
        PayonePaymentStatusCategory.Rejected &&
      singlePaymentAttempt &&
      isTerminalFailure);
  const isPending =
    !isSuccess &&
    !canRetry &&
    (["CREATED", "IN_PROGRESS", "REDIRECTED"].includes(checkout.status ?? "") ||
      [
        "CREATED",
        "REDIRECTED",
        "PENDING_CAPTURE",
        "AUTHORIZATION_REQUESTED",
        "CAPTURE_REQUESTED",
      ].includes(paymentStatus ?? ""));

  return {
    status: { isSuccess, isPending, ...(canRetry ? { canRetry: true } : {}) },
    paymentStatus,
    paymentStatusCode,
    authenticationStatus: authentication?.authenticationStatus,
    eci: authentication?.eci,
    liability: authentication?.liability,
  };
}
