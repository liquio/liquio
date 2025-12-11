const jwt = require('jsonwebtoken');
const axios = require('axios');

const ReadableData = require('../../../../../types/readable_data');
const { InvalidSchemaError, EvaluateSchemaFunctionError, ExternalServiceError } = require('../../../../../lib/errors');
const Sandbox = require('../../../../../lib/sandbox');

const CONTENT_TYPES = {
  pdf: 'application/pdf',
};
const SIGN_ALGORITHM = 'RS256';

class StandardPaymentReceiptDocumentRequesterProvider {
  /**
   * @param {Object} config
   */
  constructor(config) {
    this.config = config;
    this.sandbox = Sandbox.getInstance();
  }

  async download(options) {
    const { method } = options;

    switch (method) {
      case 'getPaymentReceipt':
        return await this.getPaymentReceipt(options);
      default:
        throw new InvalidSchemaError('Invalid provider method');
    }
  }

  /**
   * @param {Object} options
   */
  async getPaymentReceipt(options) {
    const { customer, documents, events, documentAttachmentModel, filestorage } = options;

    if (!this.config[customer]) {
      throw InvalidSchemaError(`Cannot find config for target payment customer '${customer}'`);
    }

    let merchantName;
    try {
      merchantName = this.sandbox.evalWithArgs(
        options.merchantName,
        [documents, events],
        { meta: { fn: 'merchantName', caller: 'StandardPaymentReceiptProvider.getPaymentReceipt' } },
      );
    } catch (error) {
      throw new EvaluateSchemaFunctionError(
        'saveDocument.standardPaymentReceipt.getPaymentReceipt.options.merchantName schema function throw error.',
        { cause: { error } },
      );
    }

    let orderId;
    try {
      orderId = this.sandbox.evalWithArgs(
        options.orderId,
        [documents, events],
        { meta: { fn: 'orderId', caller: 'StandardPaymentReceiptProvider.getPaymentReceipt' } },
      );
    } catch (error) {
      throw new EvaluateSchemaFunctionError('saveDocument.standardPaymentReceipt.getPaymentReceipt.options.orderId schema function throw error.', {
        cause: { error },
      });
    }

    let receiptName;
    try {
      receiptName = this.sandbox.evalWithArgs(
        options.receiptName,
        [documents, events],
        { meta: { fn: 'receiptName', caller: 'StandardPaymentReceiptProvider.getPaymentReceipt' } },
      );
    } catch (error) {
      throw new EvaluateSchemaFunctionError(
        'saveDocument.standardPaymentReceipt.getPaymentReceipt.options.receiptName schema function throw error.',
        { cause: { error } },
      );
    }

    let receiptFormat;
    try {
      receiptFormat = this.sandbox.evalWithArgs(
        options.receiptFormat,
        [documents, events],
        { meta: { fn: 'receiptFormat', caller: 'StandardPaymentReceiptProvider.getPaymentReceipt' } },
      );
    } catch (error) {
      throw new EvaluateSchemaFunctionError(
        'saveDocument.standardPaymentReceipt.getPaymentReceipt.options.receiptFormat schema function throw error.',
        { cause: { error } },
      );
    }

    let receiptMeta;
    try {
      receiptMeta = this.sandbox.evalWithArgs(
        options.receiptMeta,
        [documents, events],
        { meta: { fn: 'receiptMeta', caller: 'StandardPaymentReceiptProvider.getPaymentReceipt' } },
      );
    } catch (error) {
      throw new EvaluateSchemaFunctionError(
        'saveDocument.standardPaymentReceipt.getPaymentReceipt.options.receiptMeta schema function throw error.',
        { cause: { error } },
      );
    }

    let documentId;
    try {
      documentId = this.sandbox.evalWithArgs(
        options.documentId,
        [documents, events],
        { meta: { fn: 'documentId', caller: 'StandardPaymentReceiptProvider.getPaymentReceipt' } },
      );
    } catch (error) {
      throw new EvaluateSchemaFunctionError('saveDocument.standardPaymentReceipt.getPaymentReceipt.options.documentId schema function throw error.', {
        cause: { error },
      });
    }

    const { receiptInfo, receiptFiles } = await this.getPaymentReceiptFiles({
      customer,
      merchantName,
      orderId,
      contentType: CONTENT_TYPES[receiptFormat],
    });

    log.save('standard-payment-receipt-document-request-provider|get-payment-receipt|receipt-files', {
      receiptFiles: receiptFiles.map((v) => ({ ...v, readableStream: '****' })),
    });

    const documentAttachments = [];
    for (const [index, receipt] of receiptFiles.entries()) {
      // Check that is correct receipt format.
      if (CONTENT_TYPES[receiptFormat].toUpperCase() !== receipt.dataType.toUpperCase()) {
        log.save('standard-payment-receipt-document-request-provider|get-payment-receipt|received-invalid-format', { contentType: receipt.dataType });
        throw new ExternalServiceError(
          'StandardPaymentReceiptDocumentRequesterProvider.getPaymentReceipt. Payment customer API respond with wrong content type',
        );
      }

      const fileIter = receiptFiles.length > 1 ? `-${index + 1}` : '';
      const fullReceiptName = `${receiptName}${fileIter}.${receiptFormat}`;
      const fileMeta = { ...receiptMeta, description: `${receiptMeta.description}${fileIter}.${receiptFormat}` };

      // Upload file to file storage.
      let fileInfo;
      try {
        fileInfo = await filestorage.uploadFileFromStream(receipt.readableStream, fullReceiptName, undefined, receipt.dataType);
      } catch (error) {
        log.save('standard-payment-receipt-document-request-provider|get-payment-receipt|upload-to-file-storage-error', {
          cause: { error: error.toString() },
        });
        throw new Error(
          `StandardPaymentReceiptDocumentRequesterProvider.getPaymentReceipt. Cannot upload receipt to file storage. ${error?.toString()}`,
        );
      }

      // Add file as document attachment.
      let documentAttachment;
      try {
        documentAttachment = await documentAttachmentModel.create({
          documentId,
          name: fileInfo.name,
          type: fileInfo.contentType,
          size: fileInfo.contentLength,
          link: fileInfo.id,
          isGenerated: false,
          isSystem: true,
          meta: fileMeta,
        });
      } catch (error) {
        log.save('standard-payment-receipt-document-request-provider|get-payment-receipt|create-document-attachment-error', {
          error: error?.toString(),
          fullReceiptName,
          contentLength: fileInfo.contentLength,
          documentId,
        });
        throw new Error(
          `StandardPaymentReceiptDocumentRequesterProvider.getPaymentReceipt. Cannot create document attachments. ${error?.toString()}`,
        );
      }

      documentAttachments.push(documentAttachment);
    }

    return { receiptInfo, documentAttachments };
  }

  /**
   * @private
   * @param {string} customer
   * @param {string} merchantName
   * @param {string} orderId
   * @param {string} contentType
   * @return {Promise<{receiptInfo: Object, receiptFiles: ReadableData}>}
   */
  async getPaymentReceiptFiles({ customer, merchantName, orderId, contentType }) {
    merchantName = this.config[customer].merchantList?.[merchantName] || this.config[customer].merchantName;
    if (!merchantName) {
      throw new Error('StandardPaymentReceiptDocumentRequesterProvider.getPaymentReceiptFiles. Cannot define merchantName');
    }

    const receiptInfo = await this.getPaymentReceiptInfo(customer, merchantName, orderId);

    const receiptFiles = [];
    for (const receipt of receiptInfo.receipts) {
      const response = await global.httpClient.request(
        receipt.link,
        {
          method: 'GET',
          headers: {
            'Content-Type': contentType,
          },
          timeout: 10000,
          responseType: 'stream',
        },
        { meta: 'standard-payment-receipt-document-request-provider|get-payment-receipt-files|request' },
      );

      receiptFiles.push(
        new ReadableData({
          readableStream: response.body,
          dataType: response.headers.get('content-type'),
          dataLength: response.headers.get('content-length'),
        }),
      );
    }

    return { receiptInfo, receiptFiles };
  }

  /**
   * @private
   * @param {string} customer
   * @param {string} merchantName
   * @param {string} orderId
   * @return {Promise<Object>}
   */
  async getPaymentReceiptInfo(customer, merchantName, orderId) {
    const requestOption = {
      method: 'GET',
      url: `${this.config[customer].receiptUrl}${this.config[customer].routes.getPaymentReceipt}`.replace('<order_id>', orderId),
      headers: {
        'X-Auth-Token': await this.generateJwtToken({ order_id: orderId, merchant_name: merchantName }, customer),
        'Content-Type': 'application/json',
      },
      responseType: 'json',
      timeout: this.timeout,
    };
    log.save('standard-payment-receipt-document-request-provider|get-receipt-info|request-options', { requestOption });

    let receiptInfo;
    try {
      const response = await axios(requestOption);
      receiptInfo = response.data;
    } catch (error) {
      log.save('standard-payment-receipt-document-request-provider|get-receipt-info|response-error', { error: error?.toString() });
      error.details = {
        responseBody: error?.response?.data,
      };
      throw error;
    }
    log.save('standard-payment-receipt-document-request-provider|get-receipt-info|response', { receiptInfo });

    if (receiptInfo.result !== 'ok' || !receiptInfo?.receipts?.length) {
      throw new Error('StandardPaymentReceiptDocumentRequesterProvider.getPaymentReceiptInfo. Get receipt info error');
    }

    return receiptInfo;
  }

  /**
   * @private
   * @param {Object} payload
   * @param {string} customer
   * @return {string}
   */
  generateJwtToken(payload, customer) {
    const rsaPrivateKeyString = Buffer.from(this.config[customer].rsaPrivateKeyInBase64, 'base64').toString('utf-8');

    const payloadString = JSON.stringify({ ...payload, timestamp: new Date().getTime() });
    try {
      return jwt.sign(payloadString, rsaPrivateKeyString, { algorithm: SIGN_ALGORITHM });
    } catch (error) {
      log.save('standard-payment-receipt-document-request-provider|generate-jwt-token|sign-error', { error: error?.toString() }, 'error');
      throw new Error('StandardPaymentReceiptDocumentRequesterProvider.generateJwtToken. Cannot generate token');
    }
  }
}

module.exports = StandardPaymentReceiptDocumentRequesterProvider;
