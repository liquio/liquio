#!/usr/bin/env node
// Mirrors the exact request shape built in payone_provider.ts (no redirectPaymentMethodSpecificInput)
const {
  PAYONE_API_KEY: apiKey,
  PAYONE_API_SECRET: apiSecret,
  PAYONE_MERCHANT_ID: merchantId,
  PAYONE_BASE_URL = "https://payment.preprod.payone.com",
} = process.env;

const returnUrl = process.argv[2];
if (!returnUrl) {
  console.error("Usage: node test-returnurl.mjs <returnUrl>");
  process.exit(2);
}

const { init } = await import("onlinepayments-sdk-nodejs");
const client = init({
  host: new URL(PAYONE_BASE_URL).hostname,
  apiKeyId: apiKey,
  secretApiKey: apiSecret,
  integrator: "OnlinePayments",
});

const request = {
  order: {
    amountOfMoney: { amount: 1500, currencyCode: "EUR" },
    references: { merchantReference: `test-${Date.now()}` },
  },
  hostedCheckoutSpecificInput: {
    returnUrl,
    showResultPage: false,
  },
};

console.log(`Testing returnUrl = ${returnUrl}`);
try {
  const response = await client.hostedCheckout.createHostedCheckout(merchantId, request, null);
  if (!response.isSuccess) {
    console.error(`FAILED HTTP ${response.status}: ${JSON.stringify(response.body)}`);
  } else {
    console.log(`SUCCESS: ${JSON.stringify(response.body)}`);
  }
} catch (error) {
  console.error(`THREW: ${error.message}${error.cause ? " Cause: " + JSON.stringify(error.cause) : ""}`);
}
