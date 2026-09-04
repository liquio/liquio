import type { Request, Response } from 'express';
import { Controller } from './controller';
import { Stream } from '../lib/stream';
import type { AuthenticatedRequest } from './auth';
import { DocumentBusiness } from '../businesses/document';
import { PaymentLogsModel } from '../models/payment_logs';

// Constants.
const RAW_PAYMENT_ACTION_TYPE = 'raw';
const PROCESSED_PAYMENT_ACTION_TYPE = 'processed';

type CalculatePaymentDataRequest = AuthenticatedRequest<{ id: string }>;

type HandleStatusRequest = Request<{ customer: string; status?: string }, any, any, { noRedirect?: string }>;

type ConfirmBySmsCodeRequest = AuthenticatedRequest<{ customer: string }, { documentId: string; code: string; paymentControlPath: string }>;

type GetReceiptRequest = AuthenticatedRequest<any, any, { payment_path: string; document_id: string; order_id: string }>;

type GetWithdrawalStatusRequest = AuthenticatedRequest<any, any, { payment_path: string; document_id: string; order_id: string }>;

type ValidateApplePaySessionRequest = Request<
  any,
  any,
  { validationUrl: string; displayName: string; initiative: string; initiativeContext: string }
>;

type CancelOrderRequest = Request<any, any, { paymentCustomer: string; orderId: string; transactionId: string; sessionId: string }>;

/**
 * Payment controller.
 */
export class PaymentController extends Controller {
  private static singleton: PaymentController;

  documentBusiness: DocumentBusiness;
  paymentLogsModel: PaymentLogsModel;

  /**
   * Payment controller constructor.
   * @param {object} config Config object.
   */
  constructor(config?: any) {
    // Define singleton.
    if (!PaymentController.singleton) {
      super(config);

      this.documentBusiness = new DocumentBusiness(config);
      this.paymentLogsModel = new PaymentLogsModel();

      PaymentController.singleton = this;
    }
    return PaymentController.singleton;
  }

  /**
   * Calculate payment info.
   * @param {CalculatePaymentDataRequest} req HTTP request.
   * @param {Response} res HTTP response.
   * @returns {Promise<void>}
   */
  async calculatePaymentData(req: CalculatePaymentDataRequest, res: Response): Promise<void> {
    const { id: documentId } = req.params;
    const userId = this.getRequestUserId(req);
    const userInfo = this.getRequestUserInfo(req);
    const userUnitIds = this.getRequestUserUnitIds(req);
    const payload = req.body;
    const { name: userName, email, phone } = userInfo || {};
    const userContactInfo = { email, phone: phone || '' };

    let documentWithPayment;
    try {
      documentWithPayment = await this.documentBusiness.calculatePayment(documentId, payload, userId, userName, userUnitIds.all, userContactInfo);
    } catch (error) {
      global.log.save('calculate-payment-data-error', { error: error && error.message, documentId, payload, userId, userName }, 'error');
      return this.responseError(res, error, 500, { documentId });
    }

    this.responseData(res, documentWithPayment);
  }

  /**
   * Handle payment status.
   * @param {HandleStatusRequest} req HTTP request.
   * @param {Response} res HTTP response.
   * @returns {Promise<void>}
   */
  async handleStatus(req: HandleStatusRequest, res: Response): Promise<void> {
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
    global.log.save('handle-payment-status', {
      query: req.query,
      params: req.params,
      headers: req.headers,
      body: bodyContent,
    });

    // Save raw status data to DB.
    const rawPaymentInfo = {
      paymentAction: RAW_PAYMENT_ACTION_TYPE,
      paymentData: {
        url: req.url,
        params: req.params,
        body: bodyContent,
        headers: req.headers,
      },
    };
    let isSavedRawStatus;
    try {
      isSavedRawStatus = await (this.paymentLogsModel.save as any)(rawPaymentInfo);
    } catch (error) {
      global.log.save('save-raw-payment-logs-to-db-error', { error: error && error.message }, 'error');
    }
    if (!isSavedRawStatus) {
      global.log.save('save-raw-payment-logs-to-db-error');
    }

    let statusData;
    try {
      statusData = await this.documentBusiness.handlePaymentStatus(bodyContent, customer, status, queryParamsObject, headers);
    } catch (error) {
      global.log.save('handle-payment-status-erorr', { error: error.toString(), cause: error.cause, stack: error.stack }, 'error');
      if (defaultRedirect && !queryParamsObject.noRedirect && !paymentConfig?.[customer]?.isDisableRedirectOnErrorCallback) {
        return this.redirect(res, defaultRedirect);
      }
      return this.responseError(res, error);
    }

    // Save result status data to DB.
    let isSavedProcessedStatus;
    try {
      isSavedProcessedStatus = await (this.paymentLogsModel.save as any)({
        transactionId: statusData.transactionId,
        paymentAction: PROCESSED_PAYMENT_ACTION_TYPE,
        paymentData: statusData,
      });
    } catch (error) {
      global.log.save('save-processed-payment-logs-to-db-error', { error: error && error.message }, 'error');
    }
    if (!isSavedProcessedStatus) {
      global.log.save('save-processed-payment-logs-to-db-error');
    }

    // Redirect or response.
    return statusData && statusData.url ? this.redirect(res, statusData.url) : this.responseData(res, statusData);
  }

  /**
   * Confirm payment by sms code.
   * @param {ConfirmBySmsCodeRequest} req HTTP request.
   * @param {Response} res HTTP response.
   * @returns {Promise<void>}
   */
  async confirmBySmsCode(req: ConfirmBySmsCodeRequest, res: Response): Promise<void> {
    const { customer } = req.params;
    const { documentId, code, paymentControlPath } = req.body;
    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    let response;
    try {
      response = await this.documentBusiness.confirmBySmsCode(code, customer, paymentControlPath, documentId, userId, userUnitIds);
    } catch (error) {
      global.log.save('calculate-payment-data-error', { error: error && error.message }, 'error');
      return this.responseError(res, error);
    }

    this.responseData(res, response);
  }

  /**
   * @deprecated Method not in use.
   * Get payment receipt.
   * @param {GetReceiptRequest} req HTTP request.
   * @param {Response} res HTTP response.
   * @returns {Promise<void>}
   */
  async getReceipt(req: GetReceiptRequest, res: Response): Promise<void> {
    const { payment_path: paymentControlPath, document_id: documentId, order_id: orderId } = req.query;

    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    let response;
    try {
      response = await this.documentBusiness.getPaymentReceiptInfo(paymentControlPath, documentId, orderId, userId, userUnitIds);
    } catch (error) {
      global.log.save('get-payment-receipt-error', { error: error && error.message, documentId, orderId }, 'error');
      return this.responseError(res, error, 500, { documentId, orderId });
    }

    this.responseData(res, response);
  }

  /**
   * Get withdrawal payment status.
   * @param {GetWithdrawalStatusRequest} req HTTP request.
   * @param {Response} res HTTP response.
   * @returns {Promise<void>}
   */
  async getWithdrawalStatus(req: GetWithdrawalStatusRequest, res: Response): Promise<void> {
    const { payment_path: paymentControlPath, document_id: documentId, order_id: orderId } = req.query;

    const userId = this.getRequestUserId(req);
    const userUnitIds = this.getRequestUserUnitIds(req);

    let response;
    try {
      response = await this.documentBusiness.getWithdrawalFundsStatus(paymentControlPath, documentId, orderId, userId, userUnitIds);
    } catch (error) {
      global.log.save('get-withdrawal-status-error', { error: error && error.message, documentId, orderId }, 'error');
      return this.responseError(res, error, 500, { documentId, orderId });
    }

    this.responseData(res, response);
  }

  /**
   * Validate apple pay payment session.
   * @param {ValidateApplePaySessionRequest} req HTTP request.
   * @param {Response} res HTTP response.
   * @returns {Promise<void>}
   */
  async validateApplePaySession(req: ValidateApplePaySessionRequest, res: Response): Promise<void> {
    const { validationUrl, displayName, initiative, initiativeContext } = req.body;

    let response;
    try {
      response = await this.documentBusiness.validateApplePaySession({
        validationUrl,
        displayName,
        initiative,
        initiativeContext,
      });
    } catch (error) {
      global.log.save('validate-apple-payment-session-error', { error: error.toString() }, 'error');
      return this.responseError(res, error, 500);
    }

    this.responseData(res, response);
  }

  /**
   * Cancel payment order.
   * @param {CancelOrderRequest} req HTTP request.
   * @param {Response} res HTTP response.
   * @returns {Promise<void>}
   */
  async cancelOrder(req: CancelOrderRequest, res: Response): Promise<void> {
    try {
      const { paymentCustomer, orderId, transactionId, sessionId } = req.body;

      const response = await this.documentBusiness.cancelOrder(paymentCustomer, orderId, transactionId, sessionId);

      this.responseData(res, response);
    } catch (error) {
      global.log.save('cancel-order-payment-controller-error', { error: error && error.message }, 'error');
      return this.responseError(res, error);
    }
  }
}
