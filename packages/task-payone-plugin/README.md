# @liquio/task-payone-plugin

A payment provider plugin for **Liquio × [PAYONE E-Payment API](https://developer.payone.com/en/api-reference)**, implementing `TaskPaymentProvider` from [`@liquio/plugin-sdk`](../plugin-sdk) for `components/task`'s payment subsystem. It uses the official [`onlinepayments-sdk-nodejs`](https://github.com/OnlinePayments/onlinepayments-sdk-nodejs) Server API SDK.

## What this plugin does

This plugin implements PAYONE's redirect / hosted-checkout payment flow only — it does **not** support card tokenization, since that would require client-side tokenizer integration in the front end that is out of scope here. `calculatePayment` creates a PAYONE commerce case with an auto-executed checkout and returns the URL to redirect the customer to on PAYONE's hosted payment page. `handleStatus` receives the browser redirect / webhook callback that PAYONE sends back and re-queries PAYONE's own API for the authoritative checkout status rather than trusting the callback payload. `cancelOrder` and `checkStatus` map onto the corresponding PAYONE order-management and checkout-lookup API calls.

Six of the ten `TaskPaymentProvider` methods are not implemented, because PAYONE's Commerce Platform API has no equivalent concept for them: `confirmBySmsCode`, `unHoldOrder`, `getPaymentReceiptInfo`, `getPaymentReceiptFiles`, `getWithdrawalFundsStatus`, and `sendCheckRequest`. See [Supported operations](#supported-operations) below for the specific reason behind each one.

## Installation

This plugin is installed into `components/task` via the shared plugin-installer mechanism (`@liquio/plugin-installer`), not via a direct `npm install` in a running deployment. Add an entry for it to `components/task`'s `plugins.json` (see [Configuration](#configuration) below) and run the plugin installer against that config directory to fetch and install the package.

## Configuration

Add an entry to `components/task`'s `plugins.json`:

```json
{
  "pluginsDir": "/var/www/plugins",
  "plugins": [
    {
      "package": "@liquio/task-payone-plugin",
      "version": "0.1.1",
      "isEnabled": true,
      "name": "payone",
      "options": {
        "apiKey": "<PAYONE API key>",
        "apiSecret": "<PAYONE API secret>",
        "baseUrl": "https://api.preprod.commerce.payone.com",
        "merchantId": "<PAYONE merchant ID>",
        "defaultRedirectUrl": "https://cabinet.example.gov.ua/payment/return",
        "defaultCurrency": "UAH"
      }
    }
  ]
}
```

Field reference (`PayoneOptions` in `src/types.ts`):

| Field | Meaning |
| --- | --- |
| `apiKey` | PAYONE Commerce Platform API key, issued from the PAYONE merchant portal. |
| `apiSecret` | PAYONE Commerce Platform API secret, issued alongside `apiKey`. |
| `baseUrl` | Base URL of the PAYONE Commerce Platform API — e.g. `https://api.preprod.commerce.payone.com` for preprod, or PAYONE's production endpoint for live traffic. |
| `merchantId` | PAYONE merchant ID that commerce cases/checkouts are created under. |
| `defaultRedirectUrl` | Fallback return URL PAYONE redirects the customer back to after completing (or abandoning) the hosted payment page, used when the resolved payment data doesn't carry its own return URL. |
| `defaultCurrency` | Default ISO currency code (e.g. `UAH`, `EUR`) used when the resolved payment data doesn't carry one — `components/task`'s payment-amount resolution has no `currency` formula, so this option fills that gap. |

Then reference `"payone"` as the `providerName` in `components/task`'s own payment configuration so `PaymentService` resolves this provider by name for the relevant customer.

## Connection test

Run the hosted-checkout connectivity and authentication check with the same preprod credentials used by the plugin:

```bash
PAYONE_API_KEY="..." \
PAYONE_API_SECRET="..." \
PAYONE_MERCHANT_ID="..." \
npm run test:connection
```

Set `PAYONE_BASE_URL` to override the default `payment.preprod.payone.com` endpoint. The script calls the [Get payment products](https://developer.payone.com/en/api-reference#tag/Products/operation/GetPaymentProducts) endpoint (`GET /v2/{merchantId}/products`) and lists every payment product available to the configured merchant, including whether each one is a redirect product (`usesRedirectionTo3rdParty: true`) or a card product. Set `PAYONE_COUNTRY_CODE`, `PAYONE_CURRENCY_CODE`, and `PAYONE_AMOUNT` to change the request's country/currency/amount filters (defaults: `UA`, `EUR`, `100`).

`calculatePayment` does **not** pin a specific `paymentProductId` — it omits `redirectPaymentMethodSpecificInput` entirely and lets PAYONE show its own hosted payment-method selection page. This is deliberate: pinning any specific product ID (e.g. product `3012`, Google Pay, or even a plain card product like `1`) fails at checkout creation with a PAYONE `UNKNOWN_PRODUCT_ID` error such as `productId '1' found in 'RedirectPayment' but should be in 'CardPayment'`, because PAYONE only accepts `redirectPaymentMethodSpecificInput.paymentProductId` for products that actually support the redirect flow (`usesRedirectionTo3rdParty: true`) — and merchants are commonly provisioned with card-only products instead. Use the products list above only to confirm what the merchant has enabled, e.g. to diagnose why a checkout redirects to an empty method list.

## Supported operations

| Method | Status | Detail |
| --- | --- | --- |
| `calculatePayment` | Supported | Creates a PAYONE hosted checkout with `hostedCheckout.createHostedCheckout` and returns its redirect URL. |
| `handleStatus` | Supported | Re-queries `hostedCheckout.getHostedCheckout` for the authoritative checkout status rather than trusting the incoming callback. |
| `cancelOrder` | Supported | Resolves the hosted checkout's payment and cancels it via `payments.cancelPayment`. |
| `checkStatus` | Supported | Queries `hostedCheckout.getHostedCheckout` for the current status of a checkout. |
| `confirmBySmsCode` | Not supported | PAYONE's hosted redirect checkout has no SMS-confirmation step — any customer authentication (including 3-D Secure/OTP) happens entirely on PAYONE's own hosted page, so this backend is never asked to relay an SMS code. |
| `unHoldOrder` | Not supported | `calculatePayment` always creates an auto-executed order — PAYONE captures funds immediately on checkout completion, so there is no separate authorization hold in this integration to release. |
| `getPaymentReceiptInfo` | Not supported | PAYONE's Server API has no receipt/invoice-document endpoint. |
| `getPaymentReceiptFiles` | Not supported | Same reason as `getPaymentReceiptInfo` — no file/document-download endpoint exists in PAYONE's API for a receipt file to come from. |
| `getWithdrawalFundsStatus` | Not supported | PAYONE's API has no per-order withdrawal/payout-status endpoint — settlement to the merchant's bank account happens outside this API, per the merchant's commercial agreement with PAYONE. |
| `sendCheckRequest` | Not supported | This is a fiscal-receipt/check-registration concept with no equivalent in PAYONE's card/redirect Server API. |

Each unsupported method throws a descriptive `Error` explaining why, rather than silently returning an empty/placeholder result — see the inline comments above each method in `src/payone_provider.ts` for the full reasoning.

## Scope note: redirect-only in v1

This plugin implements PAYONE's redirect / hosted-checkout flow only — it does not support card tokenization. Integrators should not assume broader payment-method coverage than what is described above.

## License

SEE LICENSE IN ../../LICENSE.md
