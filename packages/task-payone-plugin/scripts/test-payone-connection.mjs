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
    PAYONE_COUNTRY_CODE: countryCode = "UA",
    PAYONE_CURRENCY_CODE: currencyCode = "EUR",
    PAYONE_AMOUNT: amountEnv = "100",
  } = process.env;

  try {
    const { init } = await import("onlinepayments-sdk-nodejs");
    const client = init({
      host: new URL(PAYONE_BASE_URL).hostname,
      apiKeyId: apiKey,
      secretApiKey: apiSecret,
      integrator: "OnlinePayments",
    });
    const response = await client.products.getPaymentProducts(merchantId, {
      countryCode,
      currencyCode,
      amount: Number(amountEnv),
    });

    if (!response.isSuccess) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.body)}`);
    }

    const products = response.body.paymentProducts ?? [];
    console.log(
      `PAYONE products request succeeded (${PAYONE_BASE_URL}, merchant ${merchantId}, ${countryCode}/${currencyCode}, amount ${amountEnv}): ${products.length} product(s) available`,
    );
    for (const product of products) {
      console.log(
        `  id=${product.id} paymentMethod=${product.paymentMethod} group=${product.paymentProductGroup ?? "-"} usesRedirectionTo3rdParty=${product.usesRedirectionTo3rdParty ?? false}`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error && typeof error === "object" ? error.cause : undefined;
    const causeMessage =
      cause && typeof cause === "object" && "message" in cause
        ? ` Cause: ${cause.message}`
        : "";

    console.error(`PAYONE products request failed: ${message}${causeMessage}`);
    process.exitCode = 1;
  }
}
