import jwt from 'jsonwebtoken';
import axios from 'axios';

import { ReadableData } from '../../../../../types/readable_data';
import { InvalidSchemaError, EvaluateSchemaFunctionError, ExternalServiceError } from '../../../../../lib/errors';
import { Sandbox } from '../../../../../lib/sandbox';

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
};
const SIGN_ALGORITHM = 'RS256';

export class StandardPaymentReceiptDocumentRequesterProvider {
  config: any;
  sandbox: Sandbox;
  timeout: any;

  /**
   * @param {Object} config
   */
  constructor(config: any) {
    this.config = config;
    this.sandbox = Sandbox.getInstance();
  }

  async download(options: any): Promise<any> {
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
  async getPaymentReceipt(options: any): Promise<any> {
    const { customer, documents, events, documentAttachmentModel, filestorage } = options;

    if (!this.config[customer]) {
      throw new InvalidSchemaError(`Cannot find config for target payment customer '${customer}'`);
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

    global.log.save('standard-payment-receipt-document-request-provider|get-payment-receipt|receipt-files', {
      receiptFiles: receiptFiles.map((v: any) => ({ ...v, readableStream: '****' })),
    });

    const documentAttachments = [];
    for (const [index, receipt] of receiptFiles.entries()) {
      // Check that is correct receipt format.
      if (CONTENT_TYPES[receiptFormat].toUpperCase() !== receipt.dataType.toUpperCase()) {
        global.log.save('standard-payment-receipt-document-request-provider|get-payment-receipt|received-invalid-format', { contentType: receipt.dataType });
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
      } catch (error: any) {
        global.log.save('standard-payment-receipt-document-request-provider|get-payment-receipt|upload-to-file-storage-error', {
          cause: { error: error.toString() },
        });
        const wrapped = new Error(
          `StandardPaymentReceiptDocumentRequesterProvider.getPaymentReceipt. Cannot upload receipt to file storage. ${error?.toString()}`,
        );
        (wrapped as any).cause = error;
        throw wrapped;
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
      } catch (error: any) {
        global.log.save('standard-payment-receipt-document-request-provider|get-payment-receipt|create-document-attachment-error', {
          error: error?.toString(),
          fullReceiptName,
          contentLength: fileInfo.contentLength,
          documentId,
        });
        const wrapped = new Error(
          `StandardPaymentReceiptDocumentRequesterProvider.getPaymentReceipt. Cannot create document attachments. ${error?.toString()}`,
        );
        (wrapped as any).cause = error;
        throw wrapped;
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
  async getPaymentReceiptFiles({ customer, merchantName, orderId, contentType }: any): Promise<any> {
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
  async getPaymentReceiptInfo(customer: string, merchantName: string, orderId: string): Promise<any> {
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
    global.log.save('standard-payment-receipt-document-request-provider|get-receipt-info|request-options', { requestOption });

    let receiptInfo;
    try {
      const response = await axios(requestOption as any);
      receiptInfo = response.data;
    } catch (error: any) {
      global.log.save('standard-payment-receipt-document-request-provider|get-receipt-info|response-error', { error: error?.toString() });
      error.details = {
        responseBody: error?.response?.data,
      };
      throw error;
    }
    global.log.save('standard-payment-receipt-document-request-provider|get-receipt-info|response', { receiptInfo });

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
  generateJwtToken(payload: any, customer: string): string {
    const rsaPrivateKeyString = Buffer.from(this.config[customer].rsaPrivateKeyInBase64, 'base64').toString('utf-8');

    const payloadString = JSON.stringify({ ...payload, timestamp: new Date().getTime() });
    try {
      return jwt.sign(payloadString, rsaPrivateKeyString, { algorithm: SIGN_ALGORITHM as any });
    } catch (error: any) {
      global.log.save('standard-payment-receipt-document-request-provider|generate-jwt-token|sign-error', { error: error?.toString() }, 'error');
      const wrapped = new Error('StandardPaymentReceiptDocumentRequesterProvider.generateJwtToken. Cannot generate token');
      (wrapped as any).cause = error;
      throw wrapped;
    }
  }
}
