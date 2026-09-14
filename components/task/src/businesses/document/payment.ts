import https from 'node:https';
import { Readable } from 'node:stream';

import PropByPath from 'prop-by-path';

import { ERROR_DOCUMENT_NOT_FOUND, ERROR_DOCUMENT_TEMPLATE_NOT_FOUND, ERROR_UPDATE_DOCUMENT } from '../../constants/error';
import { DocumentEntity } from '../../entities/document';
import { ForbiddenError, InvalidConfigError, InvalidSchemaError, NotFoundError } from '../../lib/errors';
import { Helpers } from '../../lib/helpers';
import { JSONPath } from '../../lib/jsonpath';
import typeOf from '../../lib/type_of';
import { DocumentValidatorService as DocumentValidator } from '../../services/document_validator';
import type { PaymentReceiptFile } from '../../services/payment/types';
import { TaskActivity } from '../../types/task_activity';
import { Business } from '../business';
import type { DocumentBusiness } from './index';
import type { UserUnitIds } from './types';

// Constants.
const CALCULATED_PAYMENT_PATH = 'calculated';
const PROCESSED_PAYMENT_PATH = 'processed';
const CONFIRM_CODE_INFO_PATH = 'confirmCodeStatus';
const CALCULATED_PAYMENT_HISTORY_PATH = 'calculatedHistory';
const UNHOLD_PAYMENT_PATH = 'unhold';
const PAYMENT_CONTROL_NAME = 'payment';
const PAYMENT_CONTROL_WIDGET_NAME = 'payment.widget';
const PAYMENT_CONTROL_WIDGET_NEW_NAME = 'payment.widget.new';
const HIDE_REPLACEMENT_TEXT = '*****';
const ERROR_GET_PAYMENT_DATA = "Can't get payment data.";

/**
 * Document payment business - calculating/orchestrating payment, provider webhooks/
 * status handling, receipts, and Apple Pay session validation. Extracted from the
 * former monolithic `DocumentBusiness` (see `document/index.ts`).
 */
export class DocumentPaymentBusiness extends Business {
  constructor(
    config: any,
    private host: DocumentBusiness,
  ) {
    super(config);
  }

  /**
   * Resolve payment amount/description/orderId/etc. formulas defined in the JSON schema's
   * payment properties into plain values, evaluated against the document.
   * @param document Document.
   * @param paymentControlPath Payment control path.
   * @param jsonSchema Json schema.
   * @param options Options.
   * @param options.isReturnOnlyList Some providers by API always expect `recipient` param as list of recipients, even if there is only one recipient.
   * @returns Resolved payment amount data.
   */
  resolvePaymentAmount(
    document: any,
    paymentControlPath: string,
    jsonSchema: any,
    options: { isReturnOnlyList?: boolean } = {},
  ): Record<string, any> | Record<string, any>[] {
    const { isReturnOnlyList = false } = options;

    const paymentProperties = PropByPath.get(jsonSchema && jsonSchema.properties, paymentControlPath);
    const recipients = paymentProperties && paymentProperties.recipients;

    if (recipients) {
      return recipients
        .map((v) => {
          const obj = {};
          for (const prop in v) {
            obj[prop] =
              typeof v[prop] === 'string'
                ? this.host.sandbox.evalWithArgs(v[prop], [document], {
                    checkArrow: true,
                    meta: { fn: 'DocumentBusiness.resolvePaymentAmount', prop },
                  })
                : v[prop];
          }
          return obj;
        })
        .filter((v) => v && v.amount !== 0);
    }

    const paymentFormula = paymentProperties && paymentProperties.amount;
    const descriptionFormula = paymentProperties && paymentProperties.description;
    const orderIdFormula = paymentProperties && paymentProperties.orderId;
    const recipientFormula = paymentProperties && paymentProperties.recipient;
    const payerFormula = paymentProperties && paymentProperties.payer;
    const suffixFormula = paymentProperties && paymentProperties.suffixFormula;
    const orderNumFormula = paymentProperties && paymentProperties.orderNum;

    const amount = this.host.sandbox.evalWithArgs(paymentFormula, [document], {
      checkArrow: true,
      meta: { fn: 'DocumentBusiness.resolvePaymentAmount.payment', documentId: document.id },
    });
    const description = this.host.sandbox.evalWithArgs(descriptionFormula, [document], {
      checkArrow: true,
      meta: { fn: 'DocumentBusiness.resolvePaymentAmount.description', documentId: document.id },
    });
    const orderId = this.host.sandbox.evalWithArgs(orderIdFormula, [document], {
      checkArrow: true,
      meta: { fn: 'DocumentBusiness.resolvePaymentAmount.orderId', documentId: document.id },
    });
    const recipient = this.host.sandbox.evalWithArgs(recipientFormula, [document], {
      checkArrow: true,
      meta: { fn: 'DocumentBusiness.resolvePaymentAmount.recipient', documentId: document.id },
    });
    const payer = this.host.sandbox.evalWithArgs(payerFormula, [document], {
      checkArrow: true,
      meta: { fn: 'DocumentBusiness.resolvePaymentAmount.payer', documentId: document.id },
    });
    const orderIdSuffix = this.host.sandbox.evalWithArgs(suffixFormula, [document], {
      checkArrow: true,
      meta: { fn: 'DocumentBusiness.resolvePaymentAmount.suffix', documentId: document.id },
    });
    const orderNum = this.host.sandbox.evalWithArgs(orderNumFormula, [document], {
      checkArrow: true,
      meta: { fn: 'DocumentBusiness.resolvePaymentAmount.orderNum', documentId: document.id },
    });

    return isReturnOnlyList
      ? [{ recipient, amount, description, orderId, payer, orderIdSuffix, orderNum }]
      : { recipient, amount, description, orderId, payer, orderIdSuffix, orderNum };
  }

  /**
   * Calculate payment.
   * @param {string} documentId Document ID.
   * @param {{paymentControlPath: string, extraData?: any}} payload Payload.
   * @param {string} userId User ID.
   * @param {string} userName User name.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User unit IDs.
   * @param {{email?: string, phone?: string}} userContactData User contact data.
   * @param {string} [workflowId] Workflow ID, used instead of documentId to look up the document.
   * @param {string} [taskTemplateId] Task template ID, used together with workflowId.
   * @returns {Promise<DocumentEntity>} Document entity.
   */
  async calculatePayment(
    documentId: string,
    payload: { paymentControlPath: string; extraData?: any },
    userId: string,
    userName: string,
    userUnitIds: UserUnitIds,
    userContactData: { email?: string; phone?: string },
    workflowId?: string,
    taskTemplateId?: string,
  ): Promise<DocumentEntity> {
    // Get document.
    const document = documentId
      ? await this.host.findByIdAndCheckAccess(documentId, userId, userUnitIds, true)
      : await this.host.getDocumentByWorkflowIdAndTaskTemplateId(workflowId, taskTemplateId as any);
    if (!document || !document.task) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }
    const { paymentControlPath, extraData } = payload;
    const paymentDocumentPath = paymentControlPath.replace(/.properties./g, '.');

    // Get document template.
    const templateId = document.documentTemplateId;
    const documentTemplate = await global.models.documentTemplate.findById(templateId);
    if (!documentTemplate) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const { jsonSchema } = documentTemplate;

    // Get provider options.
    const paymentProperties = PropByPath.get(jsonSchema && jsonSchema.properties, paymentControlPath);
    if (!paymentProperties) {
      throw new Error('Can not find payment properties in JSON schema.');
    }
    global.log.save('payment-properties', {
      documentTemplateId: documentTemplate.id,
      documentTemplateName: documentTemplate.name,
      paymentProperties,
    });
    const paymentCustomer = paymentProperties && paymentProperties.customer;
    const paymentSystemParams = this.config.payment && this.config.payment[paymentCustomer];

    // Check if sum for test.
    const { sumForTest } = this.config.payment || {};

    // Check if previous payment status is handled.
    let documentDataObject = document.data;
    const controlPaymentData = PropByPath.get(documentDataObject, paymentDocumentPath);
    const calculatedData = controlPaymentData && controlPaymentData[CALCULATED_PAYMENT_PATH];

    if (calculatedData && calculatedData.transactionId) {
      const processedData = controlPaymentData && controlPaymentData[PROCESSED_PAYMENT_PATH];
      const lastProcessedPayment = processedData && processedData[processedData.length - 1];
      if (
        !processedData ||
        !processedData.length ||
        (lastProcessedPayment && lastProcessedPayment.transactionId && lastProcessedPayment.transactionId !== calculatedData.transactionId)
      ) {
        let statusInfo;
        let rewriteCalculatedData = false;
        try {
          statusInfo = await this.handlePaymentStatus(calculatedData, paymentCustomer, calculatedData.transactionId, undefined, undefined, true);
        } catch {
          rewriteCalculatedData = true;
        }
        if (!rewriteCalculatedData && statusInfo && statusInfo.transactionId === calculatedData.transactionId) {
          const documentWithPrevState = await global.models.document.findById(documentId);
          if (!documentWithPrevState) {
            global.log.save('get-document-with-payment-status-error', { documentWithPrevState }, 'error');
            throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
          }
          if (statusInfo.status && statusInfo.status.isSuccess) return documentWithPrevState;
          // The previous checkout is still open on the provider's side (not yet paid, not
          // failed/rejected/cancelled) - reuse it instead of creating a second live payment
          // session for the same document. Without this, opening the payment page in two tabs
          // (or re-polling before the first checkout resolves) hands out two independently
          // completable checkouts for one order, and completing both charges the customer twice.
          if (statusInfo.status && statusInfo.status.isPending) return documentWithPrevState;
          documentDataObject = documentWithPrevState.data;
        }
      }
    }

    // Resolve amount/description/orderId/etc. formulas against the document (either the
    // `recipients`-list array form, or the single-recipient object form).
    const resolvedPaymentAmount = this.resolvePaymentAmount(document, paymentControlPath, jsonSchema);
    const isRecipientsList = Array.isArray(resolvedPaymentAmount);

    const paymentData = await this.host.paymentService.calculatePayment({
      paymentSystemParams,
      documentId: documentId || document.id,
      workflowId: workflowId || (document.task && document.task.workflowId),
      taskId: document.task && document.task.id,
      paymentControlPath,
      paymentCustomer,
      extraData,
      userName,
      paymentDocumentPath,
      userContactData,
      sumForTest,
      ...(isRecipientsList ? { recipients: resolvedPaymentAmount } : resolvedPaymentAmount),
    });
    if (!paymentData) {
      throw new Error(ERROR_GET_PAYMENT_DATA);
    }
    global.log.save('get-payment-data', { paymentData });

    // Update document with payment data.
    if (!controlPaymentData) PropByPath.set(documentDataObject, paymentDocumentPath, {});
    PropByPath.set(documentDataObject, `${paymentDocumentPath}.${CALCULATED_PAYMENT_PATH}`, paymentData);

    let calculatedPaymentHistory = PropByPath.get(documentDataObject, `${paymentDocumentPath}.${CALCULATED_PAYMENT_HISTORY_PATH}`);
    if (!Array.isArray(calculatedPaymentHistory)) calculatedPaymentHistory = [];
    calculatedPaymentHistory.push(paymentData);
    PropByPath.set(documentDataObject, `${paymentDocumentPath}.${CALCULATED_PAYMENT_HISTORY_PATH}`, calculatedPaymentHistory);

    const updatedDocument = await global.models.document.updateData(documentId || document.id, userId, documentDataObject);
    if (!updatedDocument) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }
    global.log.save('update-document-with-payment-data', { updatedDocument });

    // Return document.
    return updatedDocument;
  }

  /**
   * Handle payment status.
   * @param payload Payload.
   * @param paymentCustomer Payment customer.
   * @param status Status.
   * @param queryParamsObject Query params object.
   * @param headersObject Headers object.
   * @param checkPrevTransaction Check prev transaction indicator.
   * @returns Provider-shaped status info, optionally with a `url` (redirect) or `isAccepted` flag
   * mixed in - deliberately left as `any` rather than modeled precisely (shape is provider-defined).
   */
  async handlePaymentStatus(
    payload: any,
    paymentCustomer: string,
    status: string,
    queryParamsObject: any,
    headersObject: any,
    checkPrevTransaction = false,
  ): Promise<any> {
    // Get provider options.
    global.log.save('external-services-payment-status-business-payload', payload);
    const providerOptions = this.config && this.config.payment && this.config.payment[paymentCustomer];
    global.log.save('get-provider-options-to-handle-payment-status', {
      ...providerOptions,
      rsaPrivateKeyInBase64: '****',
      rsaPublicKeyInBase64: '****',
    });

    // Get status info.
    const statusInfo = await this.host.paymentService.handleStatus(
      payload,
      providerOptions,
      status,
      queryParamsObject,
      headersObject,
      checkPrevTransaction,
    );
    if (!statusInfo) {
      throw new NotFoundError("Can't get payment status.");
    }
    global.log.save('get-payment-status-info-from-payment-provider', { statusInfo });

    // Get document by user or by external service.
    const { documentId, paymentControlPath, extraData, transactionId } = statusInfo;
    const paymentDocumentPath = paymentControlPath.replace(/.properties./g, '.');

    const document: any = await global.models.document.findById(documentId);
    if (!document || !document.task) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }
    global.log.save('get-document-to-handle-payment-status', {
      document: { ...document, data: HIDE_REPLACEMENT_TEXT, documentTemplate: HIDE_REPLACEMENT_TEXT },
    }); // Do not log large document.data and document.documentTemplate.

    // Append trace meta.
    this.appendTraceMeta({ workflowId: document.task?.workflowId });

    const documentDataObject = document.data;
    const controlPaymentData = documentDataObject && PropByPath.get(documentDataObject, paymentDocumentPath);
    const { task } = document;
    const { createdBy } = task;

    global.log.save('control-payment-data', { documentId: document.id, taskId: task.id, controlPaymentData });

    // Store payment document path if hold success payment.
    if (statusInfo.status && statusInfo.status.isSuccess) {
      const calcPaymentHistory = controlPaymentData[CALCULATED_PAYMENT_HISTORY_PATH];
      const calcPaymentInfo = calcPaymentHistory.find((v) => v.transactionId === transactionId);
      const isHold = calcPaymentInfo && calcPaymentInfo.extraData && calcPaymentInfo.extraData.isHold;
      if (isHold) {
        const metaDocPayment = { paymentControlPath, isHoldPayment: isHold };
        global.businesses.task.addTaskMetadata(task, createdBy, false, metaDocPayment);
      }
    }

    // Check if duplicated success payment status.
    const isExistSuccessStatusWithTheSameTransactionId =
      Array.isArray(controlPaymentData[PROCESSED_PAYMENT_PATH]) &&
      controlPaymentData[PROCESSED_PAYMENT_PATH].some((v) => v && v.transactionId === transactionId && v.status && v.status.isSuccess);

    // Update document, add payment status.
    if (!Array.isArray(controlPaymentData && controlPaymentData[PROCESSED_PAYMENT_PATH])) {
      PropByPath.set(documentDataObject, `${paymentDocumentPath}.${PROCESSED_PAYMENT_PATH}`, []);
    }
    controlPaymentData[PROCESSED_PAYMENT_PATH].push(statusInfo);

    const updatedDocument = await global.models.document.updateData(documentId, undefined, documentDataObject);
    if (!updatedDocument) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }
    global.log.save('updated-document-with-payment-status', { documentId, controlPaymentData });

    // Get payment schema control template.
    const template = await global.models.documentTemplate.findById(document.documentTemplateId);
    if (!template) {
      global.log.save('handle-payment-status-not-found-document-template-error', {
        templateId: document.documentTemplateId,
        documentId,
        taskId: task.id,
      });
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const paymentSchemaControl = PropByPath.get(template.jsonSchema.properties, paymentControlPath) || {};

    // Check schema handlers.
    if (paymentSchemaControl.onReceiveStatusHandlers?.length) {
      if (
        typeOf(paymentSchemaControl.onReceiveStatusHandlers) !== 'array' ||
        !paymentSchemaControl.onReceiveStatusHandlers.every((v) => typeOf(v) === 'object')
      ) {
        throw new InvalidSchemaError('paymentSchemaControl.onReceiveStatusHandlers should be an array of objects.');
      }

      for (const handler of paymentSchemaControl.onReceiveStatusHandlers) {
        if (handler.type === 'register.update-one-record') {
          try {
            await this.updateOneRegisterRecord(handler, document, statusInfo);
          } catch (error) {
            const wrappedError = new Error(
              `${paymentControlPath}.onReceiveStatusHandlers.register.update-one-record. Cannot update record. ${error.toString()}`,
            );
            (wrappedError as any).cause = error;
            throw wrappedError;
          }
        }
      }
    }

    // Download receipt to file storage.
    if (statusInfo.status && statusInfo.status.isSuccess && !isExistSuccessStatusWithTheSameTransactionId) {
      const {
        extraData: { order_id: orderId },
      } = statusInfo;

      if (paymentSchemaControl.isDownloadReceipt) {
        // Do not wait this operation. We can download it later in Event.
        this.tryToDownloadPaymentReceiptFiles({ document, providerOptions, orderId, paymentSchemaControl });
      }
    }

    // Check if need to autocommit task.
    if (statusInfo.status && statusInfo.status.isSuccess) {
      // Get json schema.
      const { id: taskId } = task;
      const jsonSchema = template.jsonSchema;

      // Check valid.
      const documentValidator = new (DocumentValidator as any)(jsonSchema);
      const validationErrors = await documentValidator.check(document.data);
      if (validationErrors.length > 0) {
        // If has validation error - do not commit.
        const workflowError = {
          error: 'Validation error when try commit after payment.',
          details: validationErrors,
          queueMessage: { workflowId: task.workflowId },
        };
        await (global.models.workflowError.create as any)(workflowError);
      } else {
        // If no validation error - commit.
        // Check commitAfterPayment flag in schema.
        const { commitAfterPayment } = paymentSchemaControl || {};
        if (commitAfterPayment && !document.isFinal) {
          // Atomic guard: `setStatusFinal` only flips `is_final` from `false` to `true` once
          // (its update is conditioned on `is_final: false`), so if two concurrent payment
          // callbacks for the same document race here (e.g. two tabs each completing their own
          // checkout), only the one whose update actually affected a row proceeds to run the
          // one-time completion side effects below - the other treats it as already handled and
          // returns without re-running them. This must run (and be checked) BEFORE those side
          // effects, not after - the earlier `!document.isFinal` check alone is a stale snapshot
          // read at the top of this function and cannot serialize two concurrent callbacks.
          const isNewlyFinalized = await global.models.document.setStatusFinal(documentId);
          if (isNewlyFinalized) {
            const finishedTask = await global.models.task.setStatusFinished(taskId);

            // Handle activity.
            await global.businesses.task.handleActivityTypeEvents(task, 'TASK_COMMITTED');
            if (global.config.activity_log?.isEnabled) {
              const activity = new TaskActivity({
                type: 'TASK_COMMITTED',
                details: {
                  commitType: 'BY_EXTERNAL_SYSTEM',
                  systemName: providerOptions.providerName,
                } as any,
              });
              await global.models.task.appendActivityLog(task.id, activity);
            }

            // Set the workflow status.
            const { workflowId, taskTemplateId } = finishedTask;
            const { workflowTemplate }: any = await global.models.workflow.findById(workflowId as any);
            const documents = await global.models.task.getDocumentsByWorkflowId(workflowId);
            const events = await global.models.event.getEventsByWorkflowId(workflowId);
            try {
              await global.businesses.workflow.setWorkflowStatus(workflowId, workflowTemplate, parseInt(taskTemplateId as any), {
                documents,
                events,
              });
            } catch (error) {
              global.log.save('set-workflow-status-error', { workflowId, error: error.message });
              await global.models.workflowError.create(
                {
                  error: 'Can not set the workflow status.',
                  details: {
                    message: error.message,
                  },
                  traceMeta: {
                    workflowId,
                    taskId,
                    taskTemplateId,
                  },
                  queueMessage: {},
                },
                'warning',
              );
            }

            // Send message to RabbitMQ.
            const message = { workflowId: finishedTask.workflowId, taskId: taskId };
            global.messageQueue.produce(message);
          }
        }
      }
    }

    // Redirect or response.
    const { redirectUrl } = extraData;
    if (statusInfo.extraData && statusInfo.extraData.checkPrevPayment) return statusInfo;
    return providerOptions.doRedirect
      ? { url: redirectUrl, ...statusInfo }
      : providerOptions.notifyUrlShortResponse
        ? { isAccepted: true }
        : statusInfo;
  }

  /**
   * Confirm payment by sms code.
   * @param smsCode Sms code.
   * @param paymentCustomer Payment customer.
   * @param paymentControlPath Payment control path.
   * @param documentId Document ID.
   * @param userId User ID.
   * @param userUnitIds User units IDs.
   */
  async confirmBySmsCode(
    smsCode: string,
    paymentCustomer: string,
    paymentControlPath: string,
    documentId: string,
    userId: string,
    userUnitIds: UserUnitIds,
  ): Promise<{ isConfirmed: number; transactionId: string }> {
    // Get document.
    const document: any = await this.host.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
    if (!document) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }

    // Get payment options.
    const paymentDocumentPath = paymentControlPath.replace(/.properties./g, '.');
    const providerOptions = this.config && this.config.payment && this.config.payment[paymentCustomer];

    // Calculated payment data.
    const documentDataObject = document.data;
    const controlPaymentData = PropByPath.get(documentDataObject, paymentDocumentPath);
    const calculatedData = controlPaymentData && controlPaymentData[CALCULATED_PAYMENT_PATH];
    if (!calculatedData) {
      throw new Error('Can not handle confirm code, calculated payment data does not exist.');
    }
    const { transactionId } = calculatedData;

    // Send confirmation code.
    const confirmCodeRes = 0;
    const paymentId = undefined;
    try {
      await this.host.paymentService.confirmBySmsCode(providerOptions, calculatedData, smsCode);
    } catch (error) {
      global.log.save('confirm-code-response-error', { error }, 'error');
    }

    // Add payment status.
    const confirmCodeResObj = { isCodeConfirmed: confirmCodeRes, transactionId, paymentId: paymentId };

    // Get document again, in case there are changes about payment status.
    const documentNewVersion = await this.host.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
    if (!documentNewVersion) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }
    const documentDataObjectUpdated = documentNewVersion.data;
    PropByPath.set(documentDataObjectUpdated, `${paymentDocumentPath}.${CONFIRM_CODE_INFO_PATH}`, confirmCodeResObj);

    // Update document.
    const updatedDocument = await global.models.document.updateData(documentId, undefined, documentDataObjectUpdated);
    if (!updatedDocument) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }
    global.log.save('updated-document-with-payment-status', { updatedDocument });

    return { isConfirmed: confirmCodeRes, transactionId };
  }

  /**
   * Cancel order.
   * @param paymentCustomer config field
   * @param orderId portal data
   * @param transactionId Transaction ID
   * @param sessionId Payment session ID
   */
  async cancelOrder(paymentCustomer: string, orderId: string, transactionId: string, sessionId: string): Promise<any> {
    try {
      const providerOptions = this.config && this.config.payment && this.config.payment[paymentCustomer];

      return await this.host.paymentService.cancelOrder(providerOptions, orderId, transactionId, sessionId);
    } catch (error) {
      global.log.save('cancel-order-payment-document-error', { error: error && error.message }, 'error');
      throw error;
    }
  }

  /**
   * Unhold payment.
   * @param document Document.
   * @param taskMeta Task meta.
   * @param jsonSchema JSON schema.
   * @param userId User ID.
   */
  async unholdPayment(document: any, taskMeta: { paymentControlPath: string }, jsonSchema: any, userId: string): Promise<void> {
    const { paymentControlPath } = taskMeta;
    const documentData = document.data;
    const documentId = document.id;

    const paymentProperties = PropByPath.get(jsonSchema && jsonSchema.properties, paymentControlPath);
    if (!paymentProperties) {
      throw new Error('Can not find payment properties in JSON schema.');
    }

    const paymentCustomer = paymentProperties && paymentProperties.customer;
    const paymentSystemParams = this.config.payment && this.config.payment[paymentCustomer];
    const paymentDocumentPath = paymentControlPath.replace(/.properties./g, '.');

    const documentPaymentData = PropByPath.get(documentData, paymentDocumentPath);
    const processedPaymentArray = documentPaymentData[PROCESSED_PAYMENT_PATH];
    if (!processedPaymentArray) {
      throw new Error('Can not find processed payment data.');
    }

    const calcPaymentHistory = documentPaymentData[CALCULATED_PAYMENT_HISTORY_PATH];
    const paidOrder = processedPaymentArray.find((v) => v.status && v.status.isSuccess);
    const paidTransactionId = paidOrder && paidOrder.transactionId;
    const paidPaymentInfo = calcPaymentHistory.find((v) => v.transactionId === paidTransactionId);
    const sessionId = paidPaymentInfo && paidPaymentInfo.extraData && paidPaymentInfo.extraData.sessionId;

    // OR transaction Id when failed payment.
    const providerTransactionId = paidOrder && paidOrder.extraData && (paidOrder.extraData.paymentId || paidOrder.extraData.externalTransactionId);
    global.log.save(
      'prepare-params-to-unhold-payment',
      { paymentOptions: paymentSystemParams, transactionId: providerTransactionId, sessionId },
      'info',
    );

    let unholdPaymentRes;
    try {
      unholdPaymentRes = await this.host.paymentService.unHoldPayment({
        paymentOptions: paymentSystemParams,
        transactionId: providerTransactionId,
        sessionId,
      });
    } catch (error) {
      global.log.save('unhold-payment-while-commit-error', error, 'error');
      const wrappedError = new Error(error.message);
      (wrappedError as any).cause = error;
      throw wrappedError;
    }
    if (!unholdPaymentRes) {
      global.log.save('unhold-payment-empty-res-while-commit-error', { unholdPaymentRes, documentId }, 'error');
      throw new Error('Unhold payment result is empty.');
    }

    PropByPath.set(documentData, `${paymentDocumentPath}.${UNHOLD_PAYMENT_PATH}`, {
      ...unholdPaymentRes,
      paymentId: providerTransactionId,
      sessionId,
      transactionId: paidTransactionId,
    });

    // Update document.
    const updatedDocument = await global.models.document.updateData(documentId, userId, documentData);
    if (!updatedDocument) {
      throw new Error(ERROR_UPDATE_DOCUMENT);
    }
    global.log.save('update-document-with-payment-data', { updatedDocument });

    return;
  }

  /**
   * Get payment receipt info.
   * @param paymentControlPath Payment control path.
   * @param documentId Document Id.
   * @param orderId Order Id.
   * @param userId User Id.
   * @param userUnitIds User units IDs.
   */
  async getPaymentReceiptInfo(
    paymentControlPath: string,
    documentId: string,
    orderId: string,
    userId: string,
    userUnitIds: UserUnitIds,
  ): Promise<any> {
    // Get payment system params.
    let paymentSystemParams;
    try {
      paymentSystemParams = await this.getPaymentProviderOptionsByDocId(paymentControlPath, documentId, userId, userUnitIds);
    } catch (error) {
      global.log.save('get-payment-receipt-get-system-params-error', { error, documentId, orderId, userId });
      throw error;
    }

    const receipt = await this.host.paymentService.getPaymentReceiptInfo(paymentSystemParams, orderId);
    if (!receipt) {
      throw new Error("Can't get payment receipt.");
    }
    global.log.save('get-payment-receipt', { receipt });

    return receipt;
  }

  /**
   * Get withdrawal funds status.
   * @param paymentControlPath Payment control path.
   * @param documentId Document Id.
   * @param orderId Order Id.
   * @param userId User Id.
   * @param userUnitIds User units IDs.
   */
  async getWithdrawalFundsStatus(
    paymentControlPath: string,
    documentId: string,
    orderId: string,
    userId: string,
    userUnitIds: UserUnitIds,
  ): Promise<any> {
    // Get payment system params.
    let paymentSystemParams;
    try {
      paymentSystemParams = await this.getPaymentProviderOptionsByDocId(paymentControlPath, documentId, userId, userUnitIds);
    } catch (error) {
      global.log.save('get-withdrawal-status-get-system-params-error', { error, documentId, orderId, userId });
      throw error;
    }

    const withdrawalStatus = await this.host.paymentService.getWithdrawalFundsStatus(paymentSystemParams, orderId);
    if (!withdrawalStatus) {
      throw new Error(ERROR_GET_PAYMENT_DATA);
    }
    global.log.save('get-withdrawal-status-result', { withdrawalStatus });

    return withdrawalStatus;
  }

  /**
   * Get payment provider options by document id.
   * @param paymentControlPath Payment control path.
   * @param documentId Document Id.
   * @param userId User Id.
   * @param userUnitIds User units IDs.
   */
  async getPaymentProviderOptionsByDocId(paymentControlPath: string, documentId: string, userId: string, userUnitIds: UserUnitIds): Promise<any> {
    // Get document.
    const document: any = await this.host.findByIdAndCheckAccess(documentId, userId, userUnitIds, true);
    if (!document || !document.task) {
      throw new NotFoundError(ERROR_DOCUMENT_NOT_FOUND);
    }

    // Get document template.
    const templateId = document.documentTemplateId;
    const documentTemplate = await global.models.documentTemplate.findById(templateId);
    if (!documentTemplate) {
      throw new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND);
    }
    const { jsonSchema } = documentTemplate;

    // Get provider options.
    const paymentProperties = PropByPath.get(jsonSchema && jsonSchema.properties, paymentControlPath);
    if (!paymentProperties) {
      throw new Error('Can not find payment properties in JSON schema.');
    }
    global.log.save('payment-properties', {
      documentTemplateId: documentTemplate.id,
      documentTemplateName: documentTemplate.name,
      paymentProperties,
    });
    const paymentCustomer = paymentProperties && paymentProperties.customer;
    const paymentSystemParams = this.config.payment && this.config.payment[paymentCustomer];

    return paymentSystemParams;
  }

  /**
   * Get strict payment control path.
   * @param jsonSchema Document json schema.
   */
  getStrictPaymentControlPath(jsonSchema: any): string[] {
    const paymentControlArray = JSONPath(`$..[?(@.control === '${PAYMENT_CONTROL_NAME}')]`, jsonSchema);
    const paymentWidgetControlArray = JSONPath(`$..[?(@.control === '${PAYMENT_CONTROL_WIDGET_NAME}')]`, jsonSchema);
    const paymentWidgetNewControlArray = JSONPath(`$..[?(@.control === '${PAYMENT_CONTROL_WIDGET_NEW_NAME}')]`, jsonSchema);

    let paymentPaths: string[] = [],
      paymentWidgetPaths: string[] = [],
      paymentWidgetNewtPaths: string[] = [];

    if (paymentControlArray.length) {
      paymentPaths = paymentControlArray.filter((v) => v.strictPayment).map((v) => v.paymentControlPath);
    }

    if (paymentWidgetControlArray.length) {
      paymentWidgetPaths = paymentWidgetControlArray.filter((v) => v.strictPayment).map((v) => v.paymentControlPath);
    }

    if (paymentWidgetNewControlArray.length) {
      paymentWidgetNewtPaths = paymentWidgetNewControlArray.filter((v) => v.strictPayment).map((v) => v.paymentControlPath);
    }

    return [...paymentPaths, ...paymentWidgetPaths, ...paymentWidgetNewtPaths];
  }

  async validateApplePaySession({
    validationUrl,
    displayName,
    initiative,
    initiativeContext,
  }: {
    validationUrl: string;
    displayName: string;
    initiative: string;
    initiativeContext: string;
  }): Promise<any> {
    // Check config.
    const config = global.config?.payment?.applePay;
    if (!config) {
      throw new InvalidConfigError('payment.applePay required.');
    }

    // Check domain name.
    const { host } = new URL(validationUrl);
    if (host !== global.config.allowedApplePayGateway) {
      throw new ForbiddenError(`validationUrl domain ${host} is not allowed Apple Pay gateway.`);
    }

    // Send request to Apple API.
    const response = await global.httpClient.request(
      validationUrl,
      {
        agent: new https.Agent({
          cert: Buffer.from(global.config.merchantIdentityCertificateInBase64, 'base64').toString('utf-8'),
          key: Buffer.from(global.config.merchantIdentityPrivateKeyInBase64, 'base64').toString('utf-8'),
        }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantIdentifier: global.config.merchantIdentifier,
          displayName,
          initiative,
          initiativeContext,
        }),
      },
      'validate-apple-pay-session',
    );

    return await response.json();
  }

  async tryToDownloadPaymentReceiptFiles({
    document,
    providerOptions,
    orderId,
    paymentSchemaControl,
  }: {
    document: DocumentEntity;
    providerOptions: any;
    orderId: string;
    paymentSchemaControl: any;
  }): Promise<void> {
    try {
      const { receiptFormat = 'pdf', receiptMeta = '() => undefined;', receiptName } = paymentSchemaControl;

      // Receipt files are typed with `fileBuffer: ArrayBuffer` (matching the abstract plugin-sdk
      // provider contract), but providers actually return a `Buffer`, and `meta` is attached here
      // as an ad-hoc side-channel property, not part of the declared type.
      const receiptFiles: (Omit<PaymentReceiptFile, 'fileBuffer'> & { fileBuffer: Buffer; meta?: any })[] =
        (await this.host.paymentService.getPaymentReceiptFiles(providerOptions, orderId, receiptFormat, paymentSchemaControl)) as any;

      const isCorrectMimeType = receiptFiles.every((receipt) => Helpers.isCorrectBufferMimeType(receipt.fileBuffer, receiptFormat));
      if (!isCorrectMimeType) {
        // This is possibly an error in response buffer.
        throw new Error('Invalid payment receipt mime type.');
      }

      for (const [index, receipt] of receiptFiles.entries()) {
        const fileIter = receiptFiles.length > 1 ? `-${index + 1}` : '';
        receipt.meta = this.host.sandbox.evalWithArgs(receiptMeta, [document], {
          meta: { fn: 'receiptMeta', documentId: document.id },
        });
        const originalFileName = receiptName
          ? `${receiptName}${fileIter}.${receiptFormat}`
          : `payment-receipt-${orderId}${fileIter}.${receiptFormat}`;
        const contentType = receipt.contentType;
        const contentLength = receipt.fileBuffer.length;

        // Upload file to file storage.
        const readableStream = new Readable();
        readableStream.push(receipt.fileBuffer);
        readableStream.push(null);
        const fileInfo = await this.host.storageService.provider.uploadFileFromStream(
          readableStream,
          originalFileName,
          undefined,
          contentType,
          contentLength,
        );

        // Insert file as attachment to document.
        await this.host.documentAttachmentModel.create({
          documentId: document.id,
          name: fileInfo.name,
          type: fileInfo.contentType,
          size: fileInfo.contentLength,
          link: fileInfo.id,
          isGenerated: false,
          isSystem: true,
          meta: receipt.meta,
        });
      }
    } catch (error) {
      // Do not throw error.
      global.log.save('download-payment-receipt-error', { error: error.toString() }, 'error');
    }
  }

  async updateOneRegisterRecord(handler: any, document: DocumentEntity, status: any): Promise<void> {
    const keyId = this.host.sandbox.evalWithArgs(handler.keyId, [document], { checkArrow: true });
    if (typeOf(keyId) !== 'number') {
      throw new InvalidSchemaError('keyId should be a number.');
    }
    const recordId = this.host.sandbox.evalWithArgs(handler.recordId, [document], {
      checkArrow: true,
      meta: { fn: 'updateOneRegisterRecord.recordId', documentId: document.id },
    });
    if (typeOf(recordId) !== 'string') {
      throw new InvalidSchemaError('recordId should be a string.');
    }

    const record = await this.host.registerService.findRecordById(recordId);

    const newRecordData = this.host.sandbox.evalWithArgs(handler.newRecordData, [{ currentRecordData: record.data, document, status }], {
      checkArrow: true,
      meta: { fn: 'newRecordData', documentId: document.id },
    });

    await this.host.registerService.updateRecordById(record.id, { ...record, data: newRecordData });
  }
}
