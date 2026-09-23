import { paymentState } from "./payment_state";

describe("PAYONE payment state", () => {
  it.each(["U", "Y", "N", undefined])(
    "keeps captured funds separate from authentication %s",
    (authenticationStatus) => {
      const result = paymentState(
        {
          status: "PAYMENT_CREATED",
          createdPaymentOutput: {
            paymentStatusCategory: "SUCCESSFUL",
            payment: {
              status: "CAPTURED",
              statusOutput: { statusCode: 9 },
              paymentOutput: {
                cardPaymentMethodSpecificOutput: {
                  threeDSecureResults: {
                    authenticationStatus,
                    eci: "7",
                    liability: "merchant",
                  },
                },
              },
            },
          },
        },
        true,
      );
      expect(result).toEqual({
        status: { isSuccess: true, isPending: false },
        paymentStatus: "CAPTURED",
        paymentStatusCode: 9,
        authenticationStatus,
        eci: "7",
        liability: "merchant",
      });
    },
  );

  it.each([
    ["PENDING_CAPTURE", 5, true],
    ["AUTHORIZATION_REQUESTED", 51, true],
    ["CAPTURE_REQUESTED", 91, true],
    ["REJECTED_CAPTURE", 93, false],
    ["CANCELLED", 61, false],
    ["REFUNDED", 8, false],
    ["REFUND_REQUESTED", 81, false],
    ["UNKNOWN", 52, false],
    ["CAPTURED", undefined, false],
    [undefined, undefined, false],
  ])(
    "does not repay or report paid for %s (%s)",
    (status, statusCode, isPending) => {
      for (const paymentStatusCategory of [
        "SUCCESSFUL",
        "REJECTED",
        "STATUS_UNKNOWN",
      ]) {
        const result = paymentState(
          {
            status: "PAYMENT_CREATED",
            createdPaymentOutput: {
              paymentStatusCategory,
              payment: { status, statusOutput: { statusCode } },
            },
          },
          true,
        );
        expect(result.status).toEqual({ isSuccess: false, isPending });
      }
    },
  );

  it("requires both confirmed failure and an exhausted checkout before retry", () => {
    const checkout = {
      status: "PAYMENT_CREATED",
      createdPaymentOutput: {
        paymentStatusCategory: "REJECTED",
        payment: { status: "REJECTED", statusOutput: { statusCode: 2 } },
      },
    };
    expect(paymentState(checkout, true).status).toEqual({
      isSuccess: false,
      isPending: false,
      canRetry: true,
    });
    expect(paymentState(checkout, false).status.canRetry).toBeUndefined();
    checkout.createdPaymentOutput.paymentStatusCategory = "SUCCESSFUL";
    expect(paymentState(checkout, true).status.canRetry).toBeUndefined();
  });

  it("does not trust checkout cancellation over an existing payment", () => {
    expect(
      paymentState({ status: "CANCELLED_BY_CONSUMER" }).status.canRetry,
    ).toBe(true);
    for (const [status, statusCode] of [
      ["CAPTURED", 9],
      ["PENDING_CAPTURE", 5],
      ["CANCELLED", 61],
      [undefined, undefined],
    ] as const) {
      expect(
        paymentState(
          {
            status: "CANCELLED_BY_CONSUMER",
            createdPaymentOutput: {
              payment: { status, statusOutput: { statusCode } },
            },
          },
          true,
        ).status.canRetry,
      ).toBeUndefined();
    }
    expect(
      paymentState({
        status: "CANCELLED_BY_CONSUMER",
        createdPaymentOutput: {
          payment: { status: "CANCELLED", statusOutput: { statusCode: 6 } },
        },
      }).status.canRetry,
    ).toBe(true);
  });
});
