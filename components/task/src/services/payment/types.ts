// Shared shapes for the payment service and the providers it dispatches to. Providers are
// pluggable (built-in classes in ./providers, or plugins resolved via PluginRegistry), so these
// only pin down the fields PaymentService and its callers (businesses/document.ts,
// controllers/payment.ts) actually read or pass through - concrete providers are free to add more.

// Provider options come from config.payment[customer] - the shared `providerName` key selects the
// provider/plugin, everything else is provider-specific and passed through untouched.
export interface PaymentProviderOptions {
  providerName: string;
  [key: string]: any;
}

// What a provider hands back from calculatePayment()/handleStatus().
export interface PaymentProviderResult {
  transactionId?: string;
  documentId?: string;
  paymentControlPath?: string;
  extraData?: any;
  status?: { isSuccess?: boolean; [key: string]: any };
  url?: string;
  amount?: number;
  [key: string]: any;
}

export interface CalculatePaymentData {
  paymentSystemParams?: PaymentProviderOptions;
  documentId?: string;
  workflowId?: string;
  taskId?: string;
  paymentControlPath?: string;
  paymentCustomer?: string;
  extraData?: any;
  userName?: string;
  paymentDocumentPath?: string;
  userContactData?: { email?: string; phone?: string };
  sumForTest?: any;
  [key: string]: any;
}

export interface UnHoldPaymentData {
  paymentOptions: PaymentProviderOptions;
  transactionId?: string;
  sessionId?: string;
}

export interface PaymentReceiptFile {
  fileBuffer: ArrayBuffer;
  contentType: string;
}
