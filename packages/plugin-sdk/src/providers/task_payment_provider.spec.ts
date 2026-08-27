import { BasePlugin, PluginContext } from "./base_provider";
import { TaskPaymentData, TaskPaymentProvider } from "./task_payment_provider";

interface TestOptions {
  providerName: string;
}

class TestProvider extends TaskPaymentProvider<TestOptions> {
  async calculatePayment(data: TaskPaymentData): Promise<unknown> {
    return { calculatePayment: data };
  }

  async handleStatus(
    data: unknown,
    providerOptions: unknown,
    status: string,
    queryParamsObject: unknown,
    headersObject: unknown,
    checkPrevTransaction?: boolean,
  ): Promise<unknown> {
    return {
      data,
      providerOptions,
      status,
      queryParamsObject,
      headersObject,
      checkPrevTransaction,
    };
  }

  async confirmBySmsCode(
    providerOptions: unknown,
    calculatedData: unknown,
    smsCode: string,
  ): Promise<unknown> {
    return { providerOptions, calculatedData, smsCode };
  }

  async cancelOrder(
    providerOptions: unknown,
    orderId: string,
    transactionId: string,
    sessionId: string,
  ): Promise<unknown> {
    return { providerOptions, orderId, transactionId, sessionId };
  }

  async unHoldOrder(data: unknown): Promise<unknown> {
    return { unHoldOrder: data };
  }

  async checkStatus(
    providerOptions: unknown,
    sessionId: string,
    invoiceId: string,
  ): Promise<unknown> {
    return { providerOptions, sessionId, invoiceId };
  }

  async getPaymentReceiptInfo(args: {
    paymentSystemParams: unknown;
    orderId: string;
  }): Promise<unknown> {
    return { getPaymentReceiptInfo: args };
  }

  async getPaymentReceiptFiles(_args: {
    paymentSystemParams: unknown;
    orderId: string;
    receiptFormat: string;
    paymentControlSchema: unknown;
  }): Promise<Array<{ fileBuffer: ArrayBuffer; contentType: string }>> {
    return [{ fileBuffer: new ArrayBuffer(0), contentType: "application/pdf" }];
  }

  async getWithdrawalFundsStatus(args: {
    paymentSystemParams: unknown;
    orderId: string;
  }): Promise<unknown> {
    return { getWithdrawalFundsStatus: args };
  }

  async sendCheckRequest(providerOptions: unknown): Promise<unknown> {
    return { sendCheckRequest: providerOptions };
  }
}

describe("TaskPaymentProvider", () => {
  const context: PluginContext = {
    log: {} as PluginContext["log"],
    pluginConfig: { key: "value" },
  };
  const options: TestOptions = { providerName: "test-provider" };

  it("instantiates a concrete subclass with context and options", () => {
    const provider = new TestProvider(context, options);

    expect(provider).toBeInstanceOf(TestProvider);
  });

  it("is an instance of BasePlugin", () => {
    const provider = new TestProvider(context, options);

    expect(provider).toBeInstanceOf(BasePlugin);
  });

  it("resolves calculatePayment() to the expected result", async () => {
    const provider = new TestProvider(context, options);

    const singlePayment: TaskPaymentData = {
      amount: 15,
      currency: "EUR",
      orderId: "order-1",
      documentId: "document-1",
    };

    await expect(provider.calculatePayment(singlePayment)).resolves.toEqual({
      calculatePayment: singlePayment,
    });
  });

  it("accepts the recipients-list payload produced by task payment controls", async () => {
    const provider = new TestProvider(context, options);
    const recipientsPayment: TaskPaymentData = {
      documentId: "document-2",
      paymentControlPath: "payment.properties.paymentControl",
      recipients: [
        {
          amount: 15,
          currency: "EUR",
          description: "Test payment",
          orderId: "order-2",
        },
      ],
    };

    await expect(provider.calculatePayment(recipientsPayment)).resolves.toEqual(
      { calculatePayment: recipientsPayment },
    );
  });

  it("resolves handleStatus() to the expected result", async () => {
    const provider = new TestProvider(context, options);

    await expect(
      provider.handleStatus(
        "data",
        "providerOptions",
        "status",
        "query",
        "headers",
        true,
      ),
    ).resolves.toEqual({
      data: "data",
      providerOptions: "providerOptions",
      status: "status",
      queryParamsObject: "query",
      headersObject: "headers",
      checkPrevTransaction: true,
    });
  });

  it("resolves confirmBySmsCode() to the expected result", async () => {
    const provider = new TestProvider(context, options);

    await expect(
      provider.confirmBySmsCode("providerOptions", "calculatedData", "1234"),
    ).resolves.toEqual({
      providerOptions: "providerOptions",
      calculatedData: "calculatedData",
      smsCode: "1234",
    });
  });

  it("resolves cancelOrder() to the expected result", async () => {
    const provider = new TestProvider(context, options);

    await expect(
      provider.cancelOrder(
        "providerOptions",
        "orderId",
        "transactionId",
        "sessionId",
      ),
    ).resolves.toEqual({
      providerOptions: "providerOptions",
      orderId: "orderId",
      transactionId: "transactionId",
      sessionId: "sessionId",
    });
  });

  it("resolves unHoldOrder() to the expected result", async () => {
    const provider = new TestProvider(context, options);

    await expect(provider.unHoldOrder("data")).resolves.toEqual({
      unHoldOrder: "data",
    });
  });

  it("resolves checkStatus() to the expected result", async () => {
    const provider = new TestProvider(context, options);

    await expect(
      provider.checkStatus("providerOptions", "sessionId", "invoiceId"),
    ).resolves.toEqual({
      providerOptions: "providerOptions",
      sessionId: "sessionId",
      invoiceId: "invoiceId",
    });
  });

  it("resolves getPaymentReceiptInfo() to the expected result", async () => {
    const provider = new TestProvider(context, options);
    const args = { paymentSystemParams: "params", orderId: "orderId" };

    await expect(provider.getPaymentReceiptInfo(args)).resolves.toEqual({
      getPaymentReceiptInfo: args,
    });
  });

  it("resolves getPaymentReceiptFiles() to the expected result", async () => {
    const provider = new TestProvider(context, options);
    const args = {
      paymentSystemParams: "params",
      orderId: "orderId",
      receiptFormat: "pdf",
      paymentControlSchema: {},
    };

    await expect(provider.getPaymentReceiptFiles(args)).resolves.toEqual([
      { fileBuffer: new ArrayBuffer(0), contentType: "application/pdf" },
    ]);
  });

  it("resolves getWithdrawalFundsStatus() to the expected result", async () => {
    const provider = new TestProvider(context, options);
    const args = { paymentSystemParams: "params", orderId: "orderId" };

    await expect(provider.getWithdrawalFundsStatus(args)).resolves.toEqual({
      getWithdrawalFundsStatus: args,
    });
  });

  it("resolves sendCheckRequest() to the expected result", async () => {
    const provider = new TestProvider(context, options);

    await expect(provider.sendCheckRequest("providerOptions")).resolves.toEqual(
      {
        sendCheckRequest: "providerOptions",
      },
    );
  });
});
