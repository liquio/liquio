import { PluginContext } from "@liquio/plugin-sdk";

const createCommerceCaseRequestMock = jest.fn();
const getCheckoutRequestMock = jest.fn();
const cancelOrderMock = jest.fn();
const initMock = jest.fn();

jest.mock("onlinepayments-sdk-nodejs", () => ({
  init: initMock.mockReturnValue({
    hostedCheckout: {
      createHostedCheckout: (...args: unknown[]) =>
        Promise.resolve(
          createCommerceCaseRequestMock(args[0], {
            merchantReference: (args[1] as any).order.references
              .merchantReference,
            checkout: {
              amountOfMoney: (args[1] as any).order.amountOfMoney,
              autoExecuteOrder: true,
              orderRequest: {
                orderType: "FULL",
                paymentMethodSpecificInput: {
                  returnUrl: (args[1] as any).hostedCheckoutSpecificInput
                    .returnUrl,
                },
              },
            },
          }),
        ).then((response) => ({
          isSuccess: true,
          body: {
            hostedCheckoutId: response.checkout?.checkoutId,
            redirectUrl:
              response.checkout?.paymentResponse?.merchantAction?.redirectData
                ?.redirectURL,
          },
        })),
      getHostedCheckout: (...args: unknown[]) =>
        Promise.resolve(getCheckoutRequestMock(args[0], args[1])).then(
          (response) => ({
            isSuccess: true,
            body: {
              status:
                response.checkoutStatus === "COMPLETED" ||
                response.checkoutStatus === "BILLED"
                  ? "PAYMENT_CREATED"
                  : response.checkoutStatus,
              createdPaymentOutput: {
                paymentStatusCategory: response.statusOutput?.paymentStatus,
                payment: {
                  id: response.paymentExecutions?.[0]?.paymentExecutionId,
                  paymentOutput: {
                    references: response.references,
                  },
                },
              },
            },
          }),
        ),
    },
    payments: {
      cancelPayment: (...args: unknown[]) =>
        Promise.resolve(cancelOrderMock(...args)).then((body) => ({
          isSuccess: true,
          body,
        })),
    },
  }),
}));

import { init } from "onlinepayments-sdk-nodejs";

const OrderType = { Full: "FULL" };
const StatusCheckout = { COMPLETED: "COMPLETED", BILLED: "BILLED" };
class ApiErrorResponseException extends Error {
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
    expect(init).toHaveBeenCalledTimes(1);
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
                returnUrl: "https://example.com/return",
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

      expect(result).toMatchObject({
        redirectUrl: "https://secure.payone.com/redirect/abc",
        checkoutId: "checkout-1",
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
        sentRequest.checkout.orderRequest.paymentMethodSpecificInput.returnUrl,
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
        sentRequest.checkout.orderRequest.paymentMethodSpecificInput.returnUrl,
      ).toBe("https://example.com/default-return");
    });

    it("resolves the recipients-list shape used by task payment controls", async () => {
      createCommerceCaseRequestMock.mockResolvedValue({
        commerceCaseId: "commerce-case-recipients",
        checkout: {
          paymentResponse: {
            merchantAction: {
              redirectData: {
                redirectURL: "https://secure.payone.com/redirect/recipients",
              },
            },
          },
        },
      });

      const provider = new PayoneProvider(context, options);
      const result = await provider.calculatePayment({
        documentId: "doc-1",
        paymentControlPath: "payment.properties.paymentControl",
        recipients: [
          {
            amount: 15,
            currency: "EUR",
            description: "Test payment",
            orderId: "order-1000239001",
          },
        ],
      });

      const sentRequest = createCommerceCaseRequestMock.mock.calls[0][1];
      expect(sentRequest.checkout.amountOfMoney).toEqual({
        amount: 1500,
        currencyCode: "EUR",
      });
      expect(result).toMatchObject({
        redirectUrl: "https://secure.payone.com/redirect/recipients",
        amount: 15,
        currency: "EUR",
        orderId: "order-1000239001",
      });
    });

    it("aggregates multiple recipients into one PAYONE checkout", async () => {
      createCommerceCaseRequestMock.mockResolvedValue({
        commerceCaseId: "commerce-case-multiple-recipients",
        checkout: {
          paymentResponse: {
            merchantAction: {
              redirectData: {
                redirectURL: "https://secure.payone.com/redirect/multiple",
              },
            },
          },
        },
      });

      const provider = new PayoneProvider(context, options);
      await provider.calculatePayment({
        recipients: [
          { amount: 10, currency: "EUR", orderId: "order-1" },
          { amount: 2.5, currency: "EUR", orderId: "order-2" },
        ],
      });

      const sentRequest = createCommerceCaseRequestMock.mock.calls[0][1];
      expect(sentRequest.merchantReference).toBe("order-1");
      expect(sentRequest.checkout.amountOfMoney).toEqual({
        amount: 1250,
        currencyCode: "EUR",
      });
    });

    it("rejects an empty recipients list without calling PAYONE", async () => {
      const provider = new PayoneProvider(context, options);

      await expect(
        provider.calculatePayment({ recipients: [] }),
      ).rejects.toThrow(/missing a numeric "amount"/);
      expect(createCommerceCaseRequestMock).not.toHaveBeenCalled();
    });

    it("rejects a recipient with a non-numeric amount", async () => {
      const provider = new PayoneProvider(context, options);

      await expect(
        provider.calculatePayment({
          recipients: [{ amount: "not-a-number" as unknown as number }],
        }),
      ).rejects.toThrow(/missing a numeric "amount"/);
      expect(createCommerceCaseRequestMock).not.toHaveBeenCalled();
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
      );
      createCommerceCaseRequestMock.mockRejectedValue(apiError);

      const provider = new PayoneProvider(context, options);

      await expect(provider.calculatePayment(resolvedData)).rejects.toThrow(
        /PAYONE API call failed \(status 400\)/,
      );
    });

    describe("useTransactionBinding", () => {
      it("persists a transaction record and carries only its id on returnUrl, instead of documentId/paymentControlPath/taskId verbatim", async () => {
        createCommerceCaseRequestMock.mockResolvedValue({
          commerceCaseId: "commerce-case-tx",
          checkout: {
            checkoutId: "checkout-tx",
            paymentResponse: {
              merchantAction: {
                redirectData: {
                  redirectURL: "https://secure.payone.com/redirect/tx",
                },
              },
            },
          },
        });
        const createPaymentTransactionMock = jest
          .fn()
          .mockResolvedValue("short-tx-id");
        const boundContext: PluginContext = {
          ...context,
          paymentTransactions: {
            create: createPaymentTransactionMock,
            resolve: jest.fn(),
          },
        };

        const provider = new PayoneProvider(boundContext, options);
        await provider.calculatePayment({
          ...resolvedData,
          documentId: "doc-1",
          paymentControlPath: "payment",
          taskId: "task-1",
          paymentSystemParams: { useTransactionBinding: true },
        } as PayoneResolvedPaymentData);

        expect(createPaymentTransactionMock).toHaveBeenCalledWith({
          documentId: "doc-1",
          paymentControlPath: "payment",
          taskId: "task-1",
        });

        const sentRequest = createCommerceCaseRequestMock.mock.calls[0][1];
        const sentReturnUrl = new URL(
          sentRequest.checkout.orderRequest.paymentMethodSpecificInput
            .returnUrl,
        );
        expect(sentReturnUrl.searchParams.get("paymentTransactionId")).toBe(
          "short-tx-id",
        );
        expect(sentReturnUrl.searchParams.get("documentId")).toBeNull();
        expect(sentReturnUrl.searchParams.get("paymentControlPath")).toBeNull();
        expect(sentReturnUrl.searchParams.get("taskId")).toBeNull();
      });

      it("throws instead of silently falling back to a verbatim URL when no paymentTransactions service is available", async () => {
        const provider = new PayoneProvider(context, options);

        await expect(
          provider.calculatePayment({
            ...resolvedData,
            documentId: "doc-1",
            paymentControlPath: "payment",
            paymentSystemParams: { useTransactionBinding: true },
          } as PayoneResolvedPaymentData),
        ).rejects.toThrow(/no paymentTransactions service was provided/);
        expect(createCommerceCaseRequestMock).not.toHaveBeenCalled();
      });
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
          checkoutStatus: "PAYMENT_CREATED",
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

    it("throws a clear, descriptive error and never calls the SDK when no checkoutId can be identified", async () => {
      const provider = new PayoneProvider(context, options);

      await expect(
        provider.handleStatus("", options, "success", {}, {}),
      ).rejects.toThrow(/could not identify which PAYONE checkout/);
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
      ).rejects.toThrow(/PAYONE API call failed \(status 404\)/);
    });

    describe("useTransactionBinding", () => {
      const runtimeOptions = { ...options, useTransactionBinding: true };

      it("resolves documentId/paymentControlPath/taskId from the payment transaction record when they aren't present on the callback", async () => {
        getCheckoutRequestMock.mockResolvedValue({
          checkoutStatus: "COMPLETED",
          references: { merchantReference: "order-42" },
        });
        const resolvePaymentTransactionMock = jest.fn().mockResolvedValue({
          documentId: "document-from-tx",
          paymentControlPath: "properties.payment.fromTx",
          taskId: "task-from-tx",
        });
        const boundContext: PluginContext = {
          ...context,
          paymentTransactions: {
            create: jest.fn(),
            resolve: resolvePaymentTransactionMock,
          },
        };

        const provider = new PayoneProvider(boundContext, options);
        const result = await provider.handleStatus(
          "",
          runtimeOptions,
          "success",
          {
            commerceCaseId: "commerce-case-1",
            checkoutId: "checkout-1",
            paymentTransactionId: "short-tx-id",
          },
          {},
        );

        expect(resolvePaymentTransactionMock).toHaveBeenCalledWith(
          "short-tx-id",
        );
        expect(result.documentId).toBe("document-from-tx");
        expect(result.paymentControlPath).toBe("properties.payment.fromTx");
      });

      it("prefers documentId/paymentControlPath already present on the callback over the resolved transaction record", async () => {
        getCheckoutRequestMock.mockResolvedValue({ checkoutStatus: "OPEN" });
        const resolvePaymentTransactionMock = jest.fn().mockResolvedValue({
          documentId: "document-from-tx",
          paymentControlPath: "properties.payment.fromTx",
        });
        const boundContext: PluginContext = {
          ...context,
          paymentTransactions: {
            create: jest.fn(),
            resolve: resolvePaymentTransactionMock,
          },
        };

        const provider = new PayoneProvider(boundContext, options);
        const result = await provider.handleStatus(
          "",
          runtimeOptions,
          "success",
          { ...identifyingParams, paymentTransactionId: "short-tx-id" },
          {},
        );

        expect(resolvePaymentTransactionMock).not.toHaveBeenCalled();
        expect(result.documentId).toBe("document-1");
        expect(result.paymentControlPath).toBe("properties.payment");
      });

      it("still throws the identification error when no transaction record is found for the id", async () => {
        const resolvePaymentTransactionMock = jest
          .fn()
          .mockResolvedValue(undefined);
        const boundContext: PluginContext = {
          ...context,
          paymentTransactions: {
            create: jest.fn(),
            resolve: resolvePaymentTransactionMock,
          },
        };

        const provider = new PayoneProvider(boundContext, options);

        await expect(
          provider.handleStatus(
            "",
            runtimeOptions,
            "success",
            {
              commerceCaseId: "commerce-case-1",
              checkoutId: "checkout-1",
              paymentTransactionId: "unknown-tx-id",
            },
            {},
          ),
        ).rejects.toThrow(
          /could not identify which document\/paymentControlPath/,
        );
        expect(getCheckoutRequestMock).not.toHaveBeenCalled();
      });
    });
  });

  describe("cancelOrder", () => {
    it("cancels the payment identified by transactionId", async () => {
      getCheckoutRequestMock.mockResolvedValue({
        paymentExecutions: [{ paymentExecutionId: "payment-1" }],
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

      expect(cancelOrderMock).toHaveBeenCalledWith(
        "merchant-123",
        "payment-1",
        { isFinal: true },
        null,
      );
      expect(result).toEqual({
        orderId: "order-42",
        transactionId: "task-transaction-id",
        sessionId: "checkout-1",
        paymentId: "payment-1",
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
      expect(cancelOrderMock).not.toHaveBeenCalled();
    });

    it("translates a thrown payment API error into a clear error", async () => {
      const apiError = new ApiErrorResponseException(400, "bad request");
      getCheckoutRequestMock.mockResolvedValue({
        paymentExecutions: [{ paymentExecutionId: "payment-1" }],
      });
      cancelOrderMock.mockRejectedValue(apiError);

      const provider = new PayoneProvider(context, options);

      await expect(
        provider.cancelOrder(options, "order-42", "tx-1", "checkout-1"),
      ).rejects.toThrow(/PAYONE API call failed \(status 400\)/);
    });
  });

  describe("checkStatus", () => {
    it("re-queries the hosted checkout and returns a success shape", async () => {
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
        "checkout-1",
      );
      expect(result).toEqual({
        isSuccess: true,
        checkoutId: "checkout-1",
        hostedCheckoutStatus: "PAYMENT_CREATED",
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
      ).rejects.toThrow(/PAYONE API call failed \(status 404\)/);
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
