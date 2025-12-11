
const Controller = require('./controller');
const Stream = require('../lib/stream');

// Constants.
const RAW_PAYMENT_ACTION_TYPE = 'raw';
const PROCESSED_PAYMENT_ACTION_TYPE = 'processed';

/**
 * Payment controller.
 */
class PaymentController extends Controller {
  /**
   * Payment controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!PaymentController.singleton) {
      super(config);
      PaymentController.singleton = this;
    }
    return PaymentController.singleton;
  }

  /**
   * Calculate payment info.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async calculatePaymentData(req, res) {
    const { id: documentId } = req.params;
    const userId = this.getRequestUserId(req);
    const userInfo = this.getRequestUserInfo(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const payload = req.body;
    const { name: userName, email, phone } = userInfo || {};
    const userContactInfo = { email, phone: phone || '' };

    let documentWithPayment;
    try {
      documentWithPayment = await businesses.document.calculatePayment(documentId, payload, userId, userName, userUnitIds.all, userContactInfo);
    } catch (error) {
      log.save('calculate-payment-data-error', { error: error && error.message, documentId, payload, userId, userName }, 'error');
      return this.responseError(res, error, 500, { documentId });
    }

    this.responseData(res, documentWithPayment);
  }

  /**
   * Handle payment status.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async handleStatus(req, res) {
    // Get body content from stream.
    const bodyContent = await Stream.getFileContent(req);
    const { customer } = req.params;
    const { status } = req.params;
    const queryParamsObject = req.query;
    const headers = req.headers;

    // Get default redirect value.
    const paymentConfig = config && this.config.payment;
    const defaultRedirect = paymentConfig && paymentConfig.defaultRedirect;

    // Log query data.
    log.save('handle-payment-status', {
      query: req.query,
      params: req.params,
      headers: req.headers,
      body: bodyContent
    });

    // Save raw status data to DB.
    const rawPaymentInfo = {
      paymentAction: RAW_PAYMENT_ACTION_TYPE,
      paymentData: {
        url: req.url,
        params: req.params,
        body: bodyContent,
        headers: req.headers
      }
    };
    let isSavedRawStatus;
    try {
      isSavedRawStatus = await models.paymentLogs.save(rawPaymentInfo);
    } catch (error) {
      log.save('save-raw-payment-logs-to-db-error', { error: error && error.message }, 'error');
    }
    if (!isSavedRawStatus) {
      log.save('save-raw-payment-logs-to-db-error');
    }

    let statusData;
    try {
      statusData = await businesses.document.handlePaymentStatus(bodyContent, customer, status, queryParamsObject, headers);
    } catch (error) {
      log.save('handle-payment-status-erorr', { error: error.toString(), cause: error.cause, stack: error.stack }, 'error');
      if (defaultRedirect && !queryParamsObject.noRedirect && !paymentConfig?.[customer]?.isDisableRedirectOnErrorCallback) {
        return this.redirect(res, defaultRedirect);
      }
      return this.responseError(res, error);
    }

    // Save result status data to DB.
    let isSavedProcessedStatus;
    try {
      isSavedProcessedStatus = await models.paymentLogs.save({
        transactionId: statusData.transactionId,
        paymentAction: PROCESSED_PAYMENT_ACTION_TYPE,
        paymentData: statusData
      });
    } catch (error) {
      log.save('save-processed-payment-logs-to-db-error', { error: error && error.message }, 'error');
    }
    if (!isSavedProcessedStatus) {
      log.save('save-processed-payment-logs-to-db-error');
    }

    // Redirect or response.
    return statusData && statusData.url ? this.redirect(res, statusData.url) : this.responseData(res, statusData);
  }

  /**
   * Confirm payment by sms code.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async confirmBySmsCode(req, res) {
    const { customer } = req.params;
    const { documentId, code, paymentControlPath } = req.body;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    let response;
    try {
      response = await businesses.document.confirmBySmsCode(code, customer, paymentControlPath, documentId, userId, userUnitIds);
    } catch (error) {
      log.save('calculate-payment-data-error', { error: error && error.message }, 'error');
      return this.responseError(res, error);
    }

    this.responseData(res, response);
  }

  /**
   * @deprecated Method not in use.
   * Get payment receipt.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getReceipt(req, res) {
    const { payment_path: paymentControlPath, document_id: documentId, order_id: orderId } = req.query;

    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    let response;
    try {
      response = await businesses.document.getPaymentReceiptInfo(paymentControlPath, documentId, orderId, userId, userUnitIds);
    } catch (error) {
      log.save('get-payment-receipt-error', { error: error && error.message, documentId, orderId }, 'error',);
      return this.responseError(res, error, 500, { documentId, orderId });
    }

    this.responseData(res, response);
  }

  /**
   * Get withdrawal payment status.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getWithdrawalStatus(req, res) {
    const { payment_path: paymentControlPath, document_id: documentId, order_id: orderId } = req.query;

    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    let response;
    try {
      response = await businesses.document.getWithdrawalFundsStatus(paymentControlPath, documentId, orderId, userId, userUnitIds);
    } catch (error) {
      log.save('get-withdrawal-status-error', { error: error && error.message, documentId, orderId }, 'error',);
      return this.responseError(res, error, 500, { documentId, orderId });
    }

    this.responseData(res, response);
  }

  /**
   * Validate apple pay payment session.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async validateApplePaySession(req, res) {
    const {
      validationUrl,
      displayName,
      initiative,
      initiativeContext
    } = req.body;

    let response;
    try {
      response = await businesses.document.validateApplePaySession({
        validationUrl,
        displayName,
        initiative,
        initiativeContext
      });
    } catch (error) {
      log.save('validate-apple-payment-session-error', { error: error.toString() }, 'error',);
      return this.responseError(res, error, 500);
    }

    this.responseData(res, response);
  }

  /**
   * Confirm payment by sms code.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async cancelOrder(req, res) {
    try {
      const { paymentCustomer, orderId, transactionId, sessionId } = req.body;

      const response = await businesses.document.cancelOrder(paymentCustomer, orderId, transactionId, sessionId);

      this.responseData(res, response);

    } catch (error) {
      log.save('cancel-order-payment-controller-error', { error: error && error.message }, 'error');
      return this.responseError(res, error);
    }
  }
}

module.exports = PaymentController;
