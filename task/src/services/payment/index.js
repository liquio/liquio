/**
 * Payment service.
 */
class PaymentService {
  constructor(_config) {
    if (!PaymentService.singleton) {
      this.providers = {
        // TODO: add new providers here.
      };
      PaymentService.singleton = this;
    }

    // Return singleton.
    return PaymentService.singleton;
  }

  /**
   * Calculate payment.
   * @param {object} data Data.
   * @returns {object} Payment params object.
   */
  async calculatePayment(data) {
    const { paymentSystemParams } = data;
    const providerName = paymentSystemParams && paymentSystemParams.providerName;

    // Calculate payment data.
    let result;
    try {
      result = await this.providers[providerName].calculatePayment(data);
    } catch (error) {
      log.save('calculate-payment-data-error', { error: error && error.message }, 'error');
      throw new Error(error);
    }
    log.save('calculate-payment-data-provider-result', { result });

    return result;
  }

  /**
   * Handle payment status.
   * @param {object} data Data.
   * @param {object} providerOptions Provider options.
   * @param {string} status Status.
   * @param {object} queryParamsObject Query params object.
   * @param {object} headersObject Headers object.
   * @param {object} checkPrevTransaction Check previous transaction.
   */
  async handleStatus(data, providerOptions, status, queryParamsObject, headersObject, checkPrevTransaction) {
    const providerName = providerOptions && providerOptions.providerName;

    let result;
    try {
      result = await this.providers[providerName].handleStatus(data, providerOptions, status, queryParamsObject, headersObject, checkPrevTransaction);
    } catch (error) {
      log.save('handle-payment-status-on-provider-error', { error }, 'error');
      throw new Error(error);
    }
    log.save('handle-payment-status-on-provider-result', { result });

    return result;
  }

  /**
   * Confirm payment by sms code.
   * @param {object} providerOptions Provider Options.
   * @param {object} calculatedData Calculated data.
   * @param {string} smsCode Sms code.
   */
  async confirmBySmsCode(providerOptions, calculatedData, smsCode) {
    const providerName = providerOptions && providerOptions.providerName;

    let result;
    try {
      result = await this.providers[providerName].confirmBySmsCode(providerOptions, calculatedData, smsCode);
    } catch (error) {
      log.save('confirm-payment-by-sms-code-error', { error }, 'error');
      throw error;
    }
    log.save('confirm-payment-by-sms-code-result', { result });

    return result;
  }

  /**
   * Cancel order.
   * @param {object} providerOptions
   * @param {string} orderId
   * @param {string} transactionId
   * @param {string} sessionId
   */
  async cancelOrder(providerOptions, orderId, transactionId, sessionId) {
    try {
      const providerName = providerOptions && providerOptions.providerName;

      const result = await this.providers[providerName].cancelOrder(providerOptions, orderId, transactionId, sessionId);

      log.save('cancel-order-payment-service-result', { result });

      return result;
    } catch (error) {
      log.save('cancel-order-payment-service-error', { error: error && error.message }, 'error');
      throw error;
    }
  }

  /**
   * Unhold payment.
   * @param {object} data Data.
   */
  async unHoldPayment(data) {
    const { paymentOptions } = data;
    const providerName = paymentOptions && paymentOptions.providerName;

    let result;
    try {
      result = await this.providers[providerName].unHoldOrder(data);
    } catch (error) {
      log.save('unhold-payment-error', { error }, 'error');
      throw error;
    }
    log.save('unhold-payment-result', { result });

    return result;
  }

  /**
   * Check payment status.
   * @param {object} providerOptions Provider options.
   * @param {string} sessionId Session ID.
   * @param {string} invoiceId Invoice ID.
   */
  async checkStatus(providerOptions, sessionId, invoiceId) {
    const providerName = providerOptions && providerOptions.providerName;

    let result;
    try {
      result = await this.providers[providerName].checkStatus(providerOptions, sessionId, invoiceId);
    } catch (error) {
      log.save('cancel-payment-error', { error }, 'error');
      throw error;
    }
    log.save('cancel-payment-result', { result });

    return result;
  }

  /**
   * Get payment receipt info.
   * @param {object} providerOptions Provider options.
   * @param {string} orderId Session ID.
   * @return {Promise<Object>}
   */
  async getPaymentReceiptInfo(providerOptions, orderId) {
    const providerName = providerOptions && providerOptions.providerName;

    let result;
    try {
      result = await this.providers[providerName].getPaymentReceiptInfo({ paymentSystemParams: providerOptions, orderId });
    } catch (error) {
      log.save('get-payment-receipt-info-error', { error: error && error.message ? error.message : error }, 'error');
      throw error;
    }
    log.save('get-payment-receipt-info-result', { result });

    return result;
  }

  /**
   * Get payment receipt files.
   * @param {object} providerOptions Provider options.
   * @param {string} orderId Session ID.
   * @param {'pdf'} receiptFormat Receipt format.
   * @param {Object} paymentControlSchema
   * @return {Promise<Array<{fileBuffer: ArrayBuffer, contentType: string}>>}
   */
  async getPaymentReceiptFiles(providerOptions, orderId, receiptFormat, paymentControlSchema) {
    const providerName = providerOptions && providerOptions.providerName;

    let result;
    try {
      result = await this.providers[providerName].getPaymentReceiptFiles({
        paymentSystemParams: providerOptions,
        orderId,
        receiptFormat,
        paymentControlSchema,
      });
    } catch (error) {
      log.save('get-payment-receipt-error', { error: error && error.message ? error.message : error }, 'error');
      throw error;
    }

    log.save('get-payment-receipt-result', { result: result.map((v) => ({ ...v, fileBuffer: '****', fileBufferLength: v.fileBuffer?.length })) });

    return result;
  }

  /**
   * Get withdrawal funds status.
   * @param {object} providerOptions Provider options.
   * @param {string} orderId Session ID.
   */
  async getWithdrawalFundsStatus(providerOptions, orderId) {
    const providerName = providerOptions && providerOptions.providerName;

    let result;
    try {
      result = await this.providers[providerName].getWithdrawalFundsStatus({ paymentSystemParams: providerOptions, orderId });
    } catch (error) {
      log.save('get-withdrawal-status-provider-error', { error }, 'error');
      throw error;
    }
    log.save('get-withdrawal-status-provider-result', { result });

    return result;
  }

  /**
   * Send check request.
   * @param {object} providerOptions Provider options.
   */
  async sendCheckRequest(providerOptions) {
    const providerName = providerOptions && providerOptions.providerName;

    let result;
    try {
      result = await this.providers[providerName].sendCheckRequest(providerOptions);
    } catch (error) {
      log.save('send-check-request-error', { error }, 'error');
      throw error;
    }
    log.save('send-check-request-result', { result });

    return result;
  }
}

module.exports = PaymentService;
