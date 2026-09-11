#!/usr/bin/env node

const requiredEnv = [
  "PAYONE_API_KEY",
  "PAYONE_API_SECRET",
  "PAYONE_MERCHANT_ID",
];

const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variable(s): ${missingEnv.join(", ")}`);
  process.exitCode = 2;
} else {
  const {
    PAYONE_API_KEY: apiKey,
    PAYONE_API_SECRET: apiSecret,
    PAYONE_MERCHANT_ID: merchantId,
    PAYONE_BASE_URL = "https://payment.preprod.payone.com",
    PAYONE_PAYMENT_PRODUCT_ID: paymentProductIdEnv = "1",
    PAYONE_CURRENCY_CODE: currencyCode = "EUR",
    PAYONE_AMOUNT: amountEnv = "100",
    PAYONE_RETURN_URL: returnUrl = "https://example.com/return",
  } = process.env;

  const paymentProductId = Number(paymentProductIdEnv);

  try {
    const { init } = await import("onlinepayments-sdk-nodejs");
    const client = init({
      host: new URL(PAYONE_BASE_URL).hostname,
      apiKeyId: apiKey,
      secretApiKey: apiSecret,
      integrator: "OnlinePayments",
    });

    const request = {
      order: {
        amountOfMoney: {
          amount: Number(amountEnv),
          currencyCode,
        },
        references: {
          merchantReference: `test-${Date.now()}`,
        },
      },
      hostedCheckoutSpecificInput: {
        returnUrl,
        showResultPage: false,
      },
      redirectPaymentMethodSpecificInput: {
        paymentProductId,
      },
    };

    console.log(`Creating hosted checkout with paymentProductId=${paymentProductId}...`);
    const response = await client.hostedCheckout.createHostedCheckout(
      merchantId,
      request,
      null,
    );

    if (!response.isSuccess) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.body)}`);
    }

    console.log(
      `PAYONE hosted-checkout request succeeded (${PAYONE_BASE_URL}, merchant ${merchantId}): ${JSON.stringify(response.body)}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error && typeof error === "object" ? error.cause : undefined;
    const causeMessage =
      cause && typeof cause === "object" && "message" in cause
        ? ` Cause: ${cause.message}`
        : "";

    console.error(`PAYONE checkout test failed: ${message}${causeMessage}`);
    process.exitCode = 1;
  }
}
