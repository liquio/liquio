import { PluginRegistry } from '@liquio/plugin-sdk';

import { BadRequestError } from '../../lib/errors';
import type { CalculatePaymentData, PaymentProviderOptions, PaymentProviderResult, PaymentReceiptFile, UnHoldPaymentData } from './types';

export type { PaymentProviderOptions, PaymentProviderResult } from './types';

/**
 * Payment service.
 */
export class PaymentService {
  private static singleton: PaymentService;
  providers: Record<string, any>;
  pluginRegistry?: PluginRegistry;

  constructor(_config, pluginRegistry?: PluginRegistry) {
    if (!PaymentService.singleton) {
      this.providers = {
        // TODO: add new providers here.
      };
      this.pluginRegistry = pluginRegistry;
      PaymentService.singleton = this;
    }

    // Return singleton.
    return PaymentService.singleton;
  }

  /**
   * Resolve a provider by name, checking built-in providers first and
   * falling back to a plugin registered via `pluginRegistry`.
   * @param {string} name Provider name.
   * @returns {any} Provider instance.
   */
  private getProvider(name: string) {
    const builtIn = this.providers[name];
    if (builtIn) return builtIn;

    const plugin = this.pluginRegistry?.get(name);
    if (!plugin) throw new BadRequestError(`Provider not configured: ${name}`);

    return plugin;
  }

  /**
   * Calculate payment.
   * @param {CalculatePaymentData} data Data.
   * @returns {Promise<PaymentProviderResult>} Payment params object.
   */
  async calculatePayment(data: CalculatePaymentData): Promise<PaymentProviderResult> {
    const { paymentSystemParams } = data;
    const providerName = paymentSystemParams && paymentSystemParams.providerName;

    // Calculate payment data.
    let result;
    try {
      result = await this.getProvider(providerName).calculatePayment(data);
    } catch (error) {
      global.log.save('calculate-payment-data-error', { error: error && error.message }, 'error');
      const wrapped: any = new Error(error.message || error);
      wrapped.cause = error;
      throw wrapped;
    }
    global.log.save('calculate-payment-data-provider-result', { result });

    return result;
  }

  /**
   * Handle payment status.
   * @param {any} data Data - either the raw webhook/return request body, or a previously
   *   calculated PaymentProviderResult when re-checking a known transaction.
   * @param {PaymentProviderOptions} providerOptions Provider options.
   * @param {string} status Status.
   * @param {Record<string, any>} queryParamsObject Query params object.
   * @param {Record<string, any>} headersObject Headers object.
   * @param {boolean} [checkPrevTransaction] Check previous transaction.
   * @returns {Promise<PaymentProviderResult>}
   */
  async handleStatus(
    data: any,
    providerOptions: PaymentProviderOptions | undefined,
    status: string,
    queryParamsObject: Record<string, any>,
    headersObject: Record<string, any>,
    checkPrevTransaction?: boolean,
  ): Promise<PaymentProviderResult> {
    const providerName = providerOptions && providerOptions.providerName;

    let result;
    try {
      result = await this.getProvider(providerName).handleStatus(
        data,
        providerOptions,
        status,
        queryParamsObject,
        headersObject,
        checkPrevTransaction,
      );
    } catch (error) {
      global.log.save('handle-payment-status-on-provider-error', { error }, 'error');
      const wrapped: any = new Error(error.message || error);
      wrapped.cause = error;
      throw wrapped;
    }
    global.log.save('handle-payment-status-on-provider-result', { result });

    return result;
  }

  /**
   * Confirm payment by sms code.
   * @param {PaymentProviderOptions} providerOptions Provider Options.
   * @param {PaymentProviderResult} calculatedData Calculated data.
   * @param {string} smsCode Sms code.
   * @returns {Promise<any>}
   */
  async confirmBySmsCode(providerOptions: PaymentProviderOptions | undefined, calculatedData: PaymentProviderResult, smsCode: string): Promise<any> {
    const providerName = providerOptions && providerOptions.providerName;

    let result;
    try {
      result = await this.getProvider(providerName).confirmBySmsCode(providerOptions, calculatedData, smsCode);
    } catch (error) {
      global.log.save('confirm-payment-by-sms-code-error', { error }, 'error');
      throw error;
    }
    global.log.save('confirm-payment-by-sms-code-result', { result });

    return result;
  }

  /**
   * Cancel order.
   * @param {PaymentProviderOptions} providerOptions
   * @param {string} orderId
   * @param {string} transactionId
   * @param {string} sessionId
   * @returns {Promise<any>}
   */
  async cancelOrder(providerOptions: PaymentProviderOptions | undefined, orderId: string, transactionId: string, sessionId: string): Promise<any> {
    try {
      const providerName = providerOptions && providerOptions.providerName;

      const result = await this.getProvider(providerName).cancelOrder(providerOptions, orderId, transactionId, sessionId);

      global.log.save('cancel-order-payment-service-result', { result });

      return result;
    } catch (error) {
      global.log.save('cancel-order-payment-service-error', { error: error && error.message }, 'error');
      throw error;
    }
  }

  /**
   * Unhold payment.
   * @param {UnHoldPaymentData} data Data.
   * @returns {Promise<any>}
   */
  async unHoldPayment(data: UnHoldPaymentData): Promise<any> {
    const { paymentOptions } = data;
    const providerName = paymentOptions && paymentOptions.providerName;

    let result;
    try {
      result = await this.getProvider(providerName).unHoldOrder(data);
    } catch (error) {
      global.log.save('unhold-payment-error', { error }, 'error');
      throw error;
    }
    global.log.save('unhold-payment-result', { result });

    return result;
  }

  /**
   * Check payment status.
   * @param {PaymentProviderOptions} providerOptions Provider options.
   * @param {string} sessionId Session ID.
   * @param {string} invoiceId Invoice ID.
   * @returns {Promise<any>}
   */
  async checkStatus(providerOptions: PaymentProviderOptions | undefined, sessionId: string, invoiceId: string): Promise<any> {
    const providerName = providerOptions && providerOptions.providerName;

    let result;
    try {
      result = await this.getProvider(providerName).checkStatus(providerOptions, sessionId, invoiceId);
    } catch (error) {
      global.log.save('cancel-payment-error', { error }, 'error');
      throw error;
    }
    global.log.save('cancel-payment-result', { result });

    return result;
  }

  /**
   * Get payment receipt info.
   * @param {PaymentProviderOptions} providerOptions Provider options.
   * @param {string} orderId Session ID.
   * @return {Promise<any>}
   */
  async getPaymentReceiptInfo(providerOptions: PaymentProviderOptions | undefined, orderId: string): Promise<any> {
    const providerName = providerOptions && providerOptions.providerName;

    let result;
    try {
      result = await this.getProvider(providerName).getPaymentReceiptInfo({ paymentSystemParams: providerOptions, orderId });
    } catch (error) {
      global.log.save('get-payment-receipt-info-error', { error: error && error.message ? error.message : error }, 'error');
      throw error;
    }
    global.log.save('get-payment-receipt-info-result', { result });

    return result;
  }

  /**
   * Get payment receipt files.
   * @param {PaymentProviderOptions} providerOptions Provider options.
   * @param {string} orderId Session ID.
   * @param {'pdf'} receiptFormat Receipt format.
   * @param {Object} paymentControlSchema
   * @return {Promise<PaymentReceiptFile[]>}
   */
  async getPaymentReceiptFiles(
    providerOptions: PaymentProviderOptions | undefined,
    orderId: string,
    receiptFormat: string,
    paymentControlSchema: any,
  ): Promise<PaymentReceiptFile[]> {
    const providerName = providerOptions && providerOptions.providerName;

    let result;
    try {
      result = await this.getProvider(providerName).getPaymentReceiptFiles({
        paymentSystemParams: providerOptions,
        orderId,
        receiptFormat,
        paymentControlSchema,
      });
    } catch (error) {
      global.log.save('get-payment-receipt-error', { error: error && error.message ? error.message : error }, 'error');
      throw error;
    }

    global.log.save('get-payment-receipt-result', {
      result: result.map((v) => ({ ...v, fileBuffer: '****', fileBufferLength: v.fileBuffer?.length })),
    });

    return result;
  }

  /**
   * Get withdrawal funds status.
   * @param {PaymentProviderOptions} providerOptions Provider options.
   * @param {string} orderId Session ID.
   * @returns {Promise<any>}
   */
  async getWithdrawalFundsStatus(providerOptions: PaymentProviderOptions | undefined, orderId: string): Promise<any> {
    const providerName = providerOptions && providerOptions.providerName;

    let result;
    try {
      result = await this.getProvider(providerName).getWithdrawalFundsStatus({ paymentSystemParams: providerOptions, orderId });
    } catch (error) {
      global.log.save('get-withdrawal-status-provider-error', { error }, 'error');
      throw error;
    }
    global.log.save('get-withdrawal-status-provider-result', { result });

    return result;
  }

  /**
   * Send check request.
   * @param {PaymentProviderOptions} providerOptions Provider options.
   * @returns {Promise<any>}
   */
  async sendCheckRequest(providerOptions: PaymentProviderOptions | undefined): Promise<any> {
    const providerName = providerOptions && providerOptions.providerName;

    let result;
    try {
      result = await this.getProvider(providerName).sendCheckRequest(providerOptions);
    } catch (error) {
      global.log.save('send-check-request-error', { error }, 'error');
      throw error;
    }
    global.log.save('send-check-request-result', { result });

    return result;
  }
}
