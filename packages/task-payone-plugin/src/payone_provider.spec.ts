import { PluginContext } from "@liquio/plugin-sdk";

const createCommerceCaseRequestMock = jest.fn();
const getCheckoutRequestMock = jest.fn();
const getCheckoutsRequestMock = jest.fn();
const cancelOrderMock = jest.fn();

// `pcp-server-nodejs-sdk` ships ESM-only output, so `jest.requireActual` can't load it under
// ts-jest's CommonJS transform - instead, re-declare just the bits this spec needs (the real
// enum/error classes' shapes, mirrored from the installed `.d.ts` files) rather than mocking the
// whole module blind.
jest.mock("pcp-server-nodejs-sdk", () => {
  enum OrderType {
    Full = "FULL",
    Partial = "PARTIAL",
  }

  // Mirrors `pcp-server-nodejs-sdk/dist/models/StatusCheckout.d.ts` verbatim - real enum values,
  // not invented.
  enum StatusCheckout {
    OPEN = "OPEN",
    PENDINGCOMPLETION = "PENDING_COMPLETION",
    COMPLETED = "COMPLETED",
    BILLED = "BILLED",
    CHARGEBACKED = "CHARGEBACKED",
    DELETED = "DELETED",
  }

  class ApiException extends Error {
    constructor(
      private readonly statusCode: number,
      private readonly responseBody: string,
    ) {
      super(`ApiException: ${statusCode}`);
    }
    getStatusCode(): number {
      return this.statusCode;
    }
    getResponseBody(): string {
      return this.responseBody;
    }
  }

  class ApiErrorResponseException extends ApiException {
    constructor(
      statusCode: number,
      responseBody: string,
      private readonly errors: unknown[] = [],
    ) {
      super(statusCode, responseBody);
    }
    getErrors(): unknown[] {
      return this.errors;
    }
  }

  class ApiResponseRetrievalException extends ApiException {}

  // Minimal mirror of `pcp-server-nodejs-sdk/dist/queries/GetCheckoutsQuery.d.ts` - only the
  // one setter/behavior `cancelOrder` actually uses (`setCheckoutId`) is meaningfully faked.
  class GetCheckoutsQuery {
    private checkoutId?: string;
    setCheckoutId(checkoutId: string): this {
      this.checkoutId = checkoutId;
      return this;
    }
    getCheckoutId(): string | undefined {
      return this.checkoutId;
    }
  }

  return {
    OrderType,
    StatusCheckout,
    ApiException,
    ApiErrorResponseException,
    ApiResponseRetrievalException,
    GetCheckoutsQuery,
    CommunicatorConfiguration: jest.fn(),
    CommerceCaseApiClient: jest.fn().mockImplementation(() => ({
      createCommerceCaseRequest: createCommerceCaseRequestMock,
    })),
    CheckoutApiClient: jest.fn().mockImplementation(() => ({
      getCheckoutRequest: getCheckoutRequestMock,
      getCheckoutsRequest: getCheckoutsRequestMock,
    })),
    OrderManagementCheckoutActionsApiClient: jest
      .fn()
      .mockImplementation(() => ({
        cancelOrder: cancelOrderMock,
      })),
  };
});

import {
  ApiErrorResponseException,
  CheckoutApiClient,
  CommerceCaseApiClient,
  CommunicatorConfiguration,
  OrderManagementCheckoutActionsApiClient,
  OrderType,
  StatusCheckout,
} from "pcp-server-nodejs-sdk";

import { PayoneProvider } from "./payone_provider";
import { PayoneOptions, PayoneResolvedPaymentData } from "./types";

describe("PayoneProvider", () => {
  const context: PluginContext = {
    log: { save: jest.fn() } as unknown as PluginContext["log"],
    pluginConfig: {},
  };

  const options: PayoneOptions = {
    apiKey: "test-api-key",
    apiSecret: "test-api-secret",
    baseUrl: "https://api.preprod.commerce.payone.com",
    merchantId: "merchant-123",
    paymentProductId: 809,
    defaultRedirectUrl: "https://example.com/default-return",
    defaultCurrency: "EUR",
  };

  const resolvedData: PayoneResolvedPaymentData = {
    amount: 100.5,
    orderId: "order-42",
    description: "Test payment",
    returnUrl: "https://example.com/return",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds the SDK clients in the constructor without throwing", () => {
    expect(() => new PayoneProvider(context, options)).not.toThrow();
    expect(CommunicatorConfiguration).toBeDefined();
    expect(CommerceCaseApiClient).toHaveBeenCalledTimes(1);
    expect(CheckoutApiClient).toHaveBeenCalledTimes(1);
    expect(OrderManagementCheckoutActionsApiClient).toHaveBeenCalledTimes(1);
  });

  describe("calculatePayment", () => {
    it("sends the correct request shape and returns the extracted redirect URL", async () => {
      createCommerceCaseRequestMock.mockResolvedValue({
        commerceCaseId: "commerce-case-1",
        checkout: {
          checkoutId: "checkout-1",
          paymentResponse: {
            paymentExecutionId: "exec-1",
            merchantAction: {
              redirectData: {
                redirectURL: "https://secure.payone.com/redirect/abc",
              },
            },
          },
        },
      });

      const provider = new PayoneProvider(context, options);
      const result = await provider.calculatePayment(resolvedData);

      expect(createCommerceCaseRequestMock).toHaveBeenCalledWith(
        "merchant-123",
        {
          merchantReference: "order-42",
          checkout: {
            amountOfMoney: {
              amount: 10050,
              currencyCode: "EUR",
            },
            autoExecuteOrder: true,
            orderRequest: {
              orderType: OrderType.Full,
              paymentMethodSpecificInput: {
                redirectPaymentMethodSpecificInput: {
                  paymentProductId: 809,
                  redirectionData: {
                    returnUrl: "https://example.com/return",
                  },
                },
              },
            },
          },
        },
      );

      // Sanity: amount must be an integer number of cents, never a float carrying decimals.
      const sentRequest = createCommerceCaseRequestMock.mock.calls[0][1];
      expect(Number.isInteger(sentRequest.checkout.amountOfMoney.amount)).toBe(
        true,
      );

      expect(result).toEqual({
        redirectUrl: "https://secure.payone.com/redirect/abc",
        commerceCaseId: "commerce-case-1",
        checkoutId: "checkout-1",
        paymentExecutionId: "exec-1",
        orderId: "order-42",
        amount: 100.5,
        currency: "EUR",
      });
    });

    it("appends documentId/paymentControlPath onto returnUrl so handleStatus can identify the callback later", async () => {
      createCommerceCaseRequestMock.mockResolvedValue({
        commerceCaseId: "commerce-case-round-trip",
        checkout: {
          checkoutId: "checkout-round-trip",
          paymentResponse: {
            merchantAction: {
              redirectData: {
                redirectURL: "https://secure.payone.com/redirect/round-trip",
              },
            },
          },
        },
      });

      const provider = new PayoneProvider(context, options);
      await provider.calculatePayment({
        ...resolvedData,
        documentId: "doc-1",
        paymentControlPath: "payment",
      } as PayoneResolvedPaymentData);

      const sentRequest = createCommerceCaseRequestMock.mock.calls[0][1];
      const sentReturnUrl = new URL(
        sentRequest.checkout.orderRequest.paymentMethodSpecificInput
          .redirectPaymentMethodSpecificInput.redirectionData.returnUrl,
      );
      expect(sentReturnUrl.searchParams.get("documentId")).toBe("doc-1");
      expect(sentReturnUrl.searchParams.get("paymentControlPath")).toBe(
        "payment",
      );

      // The whole point: handleStatus must be able to pick these back up from whatever query
      // params the browser redirect carries.
      getCheckoutRequestMock.mockResolvedValue({
        checkoutStatus: StatusCheckout.COMPLETED,
        references: { merchantReference: resolvedData.orderId },
      });
      const queryParamsObject = Object.fromEntries(
        sentReturnUrl.searchParams.entries(),
      );
      const statusInfo = await provider.handleStatus(
        {},
        {},
        "success",
        {
          ...queryParamsObject,
          commerceCaseId: "commerce-case-round-trip",
          checkoutId: "checkout-round-trip",
        },
        {},
      );
      expect(statusInfo.documentId).toBe("doc-1");
      expect(statusInfo.paymentControlPath).toBe("payment");
    });

    it("falls back to defaultRedirectUrl and defaultCurrency when data does not supply them", async () => {
      createCommerceCaseRequestMock.mockResolvedValue({
        commerceCaseId: "commerce-case-2",
        checkout: {
          checkoutId: "checkout-2",
          paymentResponse: {
            merchantAction: {
              redirectData: {
                redirectURL: "https://secure.payone.com/redirect/def",
              },
            },
          },
        },
      });

      const provider = new PayoneProvider(context, options);
      await provider.calculatePayment({
        amount: 5,
        orderId: "order-99",
      } as PayoneResolvedPaymentData);

      const sentRequest = createCommerceCaseRequestMock.mock.calls[0][1];
      expect(sentRequest.checkout.amountOfMoney.currencyCode).toBe("EUR");
      expect(
        sentRequest.checkout.orderRequest.paymentMethodSpecificInput
          .redirectPaymentMethodSpecificInput.redirectionData.returnUrl,
      ).toBe("https://example.com/default-return");
    });

    it("throws a descriptive error when the response has no redirect URL", async () => {
      createCommerceCaseRequestMock.mockResolvedValue({
        commerceCaseId: "commerce-case-3",
        checkout: {},
      });

      const provider = new PayoneProvider(context, options);
      await expect(provider.calculatePayment(resolvedData)).rejects.toThrow(
        /did not contain a redirect URL/,
      );
    });

    it("throws when amount is missing/non-numeric", async () => {
      const provider = new PayoneProvider(context, options);
      await expect(
        provider.calculatePayment({
          orderId: "order-1",
        } as unknown as PayoneResolvedPaymentData),
      ).rejects.toThrow(/missing a numeric "amount"/);
      expect(createCommerceCaseRequestMock).not.toHaveBeenCalled();
    });

    it("translates a thrown ApiErrorResponseException into a clear error instead of letting it escape opaquely", async () => {
      const apiError = new ApiErrorResponseException(
        400,
        '{"errors":[{"code":"1001"}]}',
        [{ code: "1001" } as never],
      );
      createCommerceCaseRequestMock.mockRejectedValue(apiError);

      const provider = new PayoneProvider(context, options);

      await expect(provider.calculatePayment(resolvedData)).rejects.toThrow(
        /PAYONE API returned an error response \(status 400\)/,
      );
    });
  });

  describe("handleStatus", () => {
    const identifyingParams = {
      commerceCaseId: "commerce-case-1",
      checkoutId: "checkout-1",
      documentId: "document-1",
      paymentControlPath: "properties.payment",
    };

    it("re-queries PAYONE and returns a success shape for a completed checkout", async () => {
      getCheckoutRequestMock.mockResolvedValue({
        commerceCaseId: "commerce-case-1",
        checkoutId: "checkout-1",
        checkoutStatus: "COMPLETED",
        references: { merchantReference: "order-42" },
        paymentExecutions: [{ paymentExecutionId: "exec-1" }],
        statusOutput: { paymentStatus: "PAYMENT_COMPLETED" },
      });

      const provider = new PayoneProvider(context, options);
      const result = await provider.handleStatus(
        "",
        options,
        "success",
        identifyingParams,
        {},
      );

      expect(getCheckoutRequestMock).toHaveBeenCalledWith(
        "merchant-123",
        "commerce-case-1",
        "checkout-1",
      );
      expect(result).toEqual({
        documentId: "document-1",
        paymentControlPath: "properties.payment",
        transactionId: "exec-1",
        status: { isSuccess: true },
        extraData: {
          order_id: "order-42",
          commerceCaseId: "commerce-case-1",
          checkoutId: "checkout-1",
          checkoutStatus: "COMPLETED",
          paymentStatus: "PAYMENT_COMPLETED",
          checkPrevTransaction: false,
        },
      });
    });

    it("re-queries PAYONE and returns a failure shape for a still-open/non-terminal checkout, never trusting the incoming status", async () => {
      getCheckoutRequestMock.mockResolvedValue({
        commerceCaseId: "commerce-case-1",
        checkoutId: "checkout-1",
        checkoutStatus: "OPEN",
      });

      const provider = new PayoneProvider(context, options);
      // The redirect claims "success" in the URL, but PAYONE's own API says the checkout is still
      // OPEN - the defensive design must trust the re-query, not the incoming callback status.
      const result = await provider.handleStatus(
        "",
        options,
        "success",
        identifyingParams,
        {},
      );

      expect(result.status).toEqual({ isSuccess: false });
      expect(result.transactionId).toBe("checkout-1");
    });

    it("returns a failure shape for a chargebacked checkout", async () => {
      getCheckoutRequestMock.mockResolvedValue({
        checkoutStatus: "CHARGEBACKED",
      });

      const provider = new PayoneProvider(context, options);
      const result = await provider.handleStatus(
        "",
        options,
        "success",
        identifyingParams,
        {},
      );

      expect(result.status).toEqual({ isSuccess: false });
    });

    it("throws a clear, descriptive error and never calls the SDK when no commerceCaseId/checkoutId can be identified", async () => {
      const provider = new PayoneProvider(context, options);

      await expect(
        provider.handleStatus("", options, "success", {}, {}),
      ).rejects.toThrow(/could not identify which PAYONE commerce case/);
      expect(getCheckoutRequestMock).not.toHaveBeenCalled();
    });

    it("throws a clear error when the checkout is identifiable but documentId/paymentControlPath are not", async () => {
      const provider = new PayoneProvider(context, options);

      await expect(
        provider.handleStatus(
          "",
          options,
          "success",
          { commerceCaseId: "commerce-case-1", checkoutId: "checkout-1" },
          {},
        ),
      ).rejects.toThrow(
        /could not identify which document\/paymentControlPath/,
      );
      expect(getCheckoutRequestMock).not.toHaveBeenCalled();
    });

    it("parses a JSON string webhook body (POST case) the same way as query params", async () => {
      getCheckoutRequestMock.mockResolvedValue({ checkoutStatus: "BILLED" });

      const provider = new PayoneProvider(context, options);
      const result = await provider.handleStatus(
        JSON.stringify(identifyingParams),
        options,
        "success",
        {},
        {},
      );

      expect(getCheckoutRequestMock).toHaveBeenCalledWith(
        "merchant-123",
        "commerce-case-1",
        "checkout-1",
      );
      expect(result.status).toEqual({ isSuccess: true });
    });

    it("identifies the checkout directly from `data` for the checkPrevTransaction re-check path (no query params)", async () => {
      getCheckoutRequestMock.mockResolvedValue({ checkoutStatus: "COMPLETED" });

      const provider = new PayoneProvider(context, options);
      const result = await provider.handleStatus(
        {
          commerceCaseId: "commerce-case-1",
          checkoutId: "checkout-1",
          documentId: "document-1",
          paymentControlPath: "properties.payment",
          transactionId: "prev-transaction-id",
        },
        options,
        "prev-transaction-id",
        undefined,
        undefined,
        true,
      );

      expect(result.status.isSuccess).toBe(true);
      expect(result.extraData.checkPrevTransaction).toBe(true);
      expect(result.transactionId).toBe("prev-transaction-id");
    });

    it("translates a thrown ApiErrorResponseException from the re-query into a clear error", async () => {
      const apiError = new ApiErrorResponseException(404, "not found");
      getCheckoutRequestMock.mockRejectedValue(apiError);

      const provider = new PayoneProvider(context, options);

      await expect(
        provider.handleStatus("", options, "success", identifyingParams, {}),
      ).rejects.toThrow(/PAYONE API returned an error response \(status 404\)/);
    });
  });

  describe("cancelOrder", () => {
    it("resolves the checkoutId's commerceCaseId and cancels the order (happy path)", async () => {
      getCheckoutsRequestMock.mockResolvedValue({
        numberOfCheckouts: 1,
        checkouts: [
          { checkoutId: "checkout-1", commerceCaseId: "commerce-case-1" },
        ],
      });
      cancelOrderMock.mockResolvedValue({
        cancelPaymentResponse: { payment: { id: "payment-1" } },
      });

      const provider = new PayoneProvider(context, options);
      const result = await provider.cancelOrder(
        options,
        "order-42",
        "task-transaction-id",
        "checkout-1",
      );

      expect(getCheckoutsRequestMock).toHaveBeenCalledWith(
        "merchant-123",
        expect.anything(),
      );
      expect(cancelOrderMock).toHaveBeenCalledWith(
        "merchant-123",
        "commerce-case-1",
        "checkout-1",
      );
      expect(result).toEqual({
        orderId: "order-42",
        transactionId: "task-transaction-id",
        sessionId: "checkout-1",
        commerceCaseId: "commerce-case-1",
        checkoutId: "checkout-1",
        cancelResponse: {
          cancelPaymentResponse: { payment: { id: "payment-1" } },
        },
      });
    });

    it("throws a descriptive error when sessionId is missing", async () => {
      const provider = new PayoneProvider(context, options);

      await expect(
        provider.cancelOrder(options, "order-42", "task-transaction-id", ""),
      ).rejects.toThrow(/missing "sessionId"/);
      expect(getCheckoutsRequestMock).not.toHaveBeenCalled();
    });

    it("throws a descriptive error when no matching checkout/commerceCaseId can be found", async () => {
      getCheckoutsRequestMock.mockResolvedValue({
        numberOfCheckouts: 0,
        checkouts: [],
      });

      const provider = new PayoneProvider(context, options);

      await expect(
        provider.cancelOrder(
          options,
          "order-42",
          "task-transaction-id",
          "checkout-unknown",
        ),
      ).rejects.toThrow(/could not resolve a PAYONE commerceCaseId/);
      expect(cancelOrderMock).not.toHaveBeenCalled();
    });

    it("translates a thrown ApiErrorResponseException into a clear error", async () => {
      const apiError = new ApiErrorResponseException(400, "bad request");
      getCheckoutsRequestMock.mockRejectedValue(apiError);

      const provider = new PayoneProvider(context, options);

      await expect(
        provider.cancelOrder(options, "order-42", "tx-1", "checkout-1"),
      ).rejects.toThrow(/PAYONE API returned an error response \(status 400\)/);
    });
  });

  describe("checkStatus", () => {
    it("re-queries the checkout by commerceCaseId/checkoutId and returns a success shape", async () => {
      getCheckoutRequestMock.mockResolvedValue({
        checkoutStatus: "COMPLETED",
        statusOutput: { paymentStatus: "PAYMENT_COMPLETED" },
        references: { merchantReference: "order-42" },
      });

      const provider = new PayoneProvider(context, options);
      const result = await provider.checkStatus(
        options,
        "checkout-1",
        "commerce-case-1",
      );

      expect(getCheckoutRequestMock).toHaveBeenCalledWith(
        "merchant-123",
        "commerce-case-1",
        "checkout-1",
      );
      expect(result).toEqual({
        isSuccess: true,
        commerceCaseId: "commerce-case-1",
        checkoutId: "checkout-1",
        checkoutStatus: "COMPLETED",
        paymentStatus: "PAYMENT_COMPLETED",
        orderId: "order-42",
      });
    });

    it("returns a failure shape for a non-terminal checkout", async () => {
      getCheckoutRequestMock.mockResolvedValue({ checkoutStatus: "OPEN" });

      const provider = new PayoneProvider(context, options);
      const result = await provider.checkStatus(
        options,
        "checkout-1",
        "commerce-case-1",
      );

      expect(result).toMatchObject({ isSuccess: false });
    });

    it("throws a descriptive error when sessionId/invoiceId are missing", async () => {
      const provider = new PayoneProvider(context, options);

      await expect(provider.checkStatus(options, "", "")).rejects.toThrow(
        /missing "sessionId"\/"invoiceId"/,
      );
      expect(getCheckoutRequestMock).not.toHaveBeenCalled();
    });

    it("translates a thrown ApiErrorResponseException into a clear error", async () => {
      const apiError = new ApiErrorResponseException(404, "not found");
      getCheckoutRequestMock.mockRejectedValue(apiError);

      const provider = new PayoneProvider(context, options);

      await expect(
        provider.checkStatus(options, "checkout-1", "commerce-case-1"),
      ).rejects.toThrow(/PAYONE API returned an error response \(status 404\)/);
    });
  });

  describe("not-supported methods", () => {
    it("confirmBySmsCode rejects with a specific reason", async () => {
      const provider = new PayoneProvider(context, options);

      await expect(
        provider.confirmBySmsCode(options, {}, "1234"),
      ).rejects.toThrow(
        /confirmBySmsCode is not supported by the Payone provider/,
      );
    });

    it("unHoldOrder rejects with a specific reason", async () => {
      const provider = new PayoneProvider(context, options);

      await expect(provider.unHoldOrder({})).rejects.toThrow(
        /unHoldOrder is not supported by the Payone provider/,
      );
    });

    it("getPaymentReceiptInfo rejects with a specific reason", async () => {
      const provider = new PayoneProvider(context, options);

      await expect(
        provider.getPaymentReceiptInfo({
          paymentSystemParams: options,
          orderId: "order-42",
        }),
      ).rejects.toThrow(
        /getPaymentReceiptInfo is not supported by the Payone provider/,
      );
    });

    it("getPaymentReceiptFiles rejects with a specific reason", async () => {
      const provider = new PayoneProvider(context, options);

      await expect(
        provider.getPaymentReceiptFiles({
          paymentSystemParams: options,
          orderId: "order-42",
          receiptFormat: "pdf",
          paymentControlSchema: {},
        }),
      ).rejects.toThrow(
        /getPaymentReceiptFiles is not supported by the Payone provider/,
      );
    });

    it("getWithdrawalFundsStatus rejects with a specific reason", async () => {
      const provider = new PayoneProvider(context, options);

      await expect(
        provider.getWithdrawalFundsStatus({
          paymentSystemParams: options,
          orderId: "order-42",
        }),
      ).rejects.toThrow(
        /getWithdrawalFundsStatus is not supported by the Payone provider/,
      );
    });

    it("sendCheckRequest rejects with a specific reason", async () => {
      const provider = new PayoneProvider(context, options);

      await expect(provider.sendCheckRequest(options)).rejects.toThrow(
        /sendCheckRequest is not supported by the Payone provider/,
      );
    });
  });
});
