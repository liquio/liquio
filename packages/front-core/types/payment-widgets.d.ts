// Third-party payment SDK globals loaded at runtime via <script> tags
// (UkrGasBank widget, Apple Pay JS API, Google Pay API), none of which ship
// their own TypeScript types. Scoped to the shape actually used by
// components/JsonSchema/elements/PaymentWidget.tsx.

interface UGBWidgetInstance {
  open(): void;
  onReady(): Promise<void>;
  validateForm(): Promise<boolean>;
  formSubmit(): void;
}

interface UGBWidgetQuickInitOptions {
  key: unknown;
  amount: number;
  mode: string;
  lang: string;
  type: string;
  selector: string;
  style: string;
  template: string;
  properties?: { showSubmit?: boolean };
  onToken: (tokenData: { token?: string } | null | undefined) => void;
}

declare const UGBWidget: {
  quick_init(options: UGBWidgetQuickInitOptions): UGBWidgetInstance;
};

interface ApplePayValidateMerchantEvent {
  validationURL: string;
}

interface ApplePayPaymentAuthorizedEvent {
  payment: { token: unknown };
}

interface ApplePaySessionInstance {
  onvalidatemerchant: ((event: ApplePayValidateMerchantEvent) => void) | null;
  onpaymentauthorized: ((event: ApplePayPaymentAuthorizedEvent) => void) | null;
  begin(): void;
  abort(): void;
  completeMerchantValidation(merchantSession: unknown): Promise<void> | void;
  completePayment(status: number): void;
}

interface ApplePaySessionConstructor {
  new (version: number, paymentRequest: unknown): ApplePaySessionInstance;
  STATUS_SUCCESS: number;
}

interface GooglePayPaymentsClient {
  loadPaymentData(paymentRequest: unknown): Promise<{
    paymentMethodData: { tokenizationData: { token: string } };
  }>;
}

interface Window {
  ApplePaySession?: ApplePaySessionConstructor;
  google?: {
    payments: {
      api: {
        PaymentsClient: new (options: { environment: unknown }) => GooglePayPaymentsClient;
      };
    };
  };
}
