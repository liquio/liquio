const Sign = require('../../../../../lib/sign');
const Decorator = require('./decorator');
const typeOf = require('../../../../../lib/type_of');

/**
 * Decorator standard.
 * @typedef {import('../../../../../entities/document')} DocumentEntity
 * @typedef {import('../../../../../entities/document_attachment')} DocumentAttachmentEntity
 * @typedef {import('../../../../../models/document_attachment')} DocumentAttachmentModel
 * @typedef {import('../../../../../lib/filestorage')} Filestorage
 */
class DecoratorStandard extends Decorator {
  /**
   * Transform.
   * @param {object} data Data to transform.
   * @param {'standard'} data.providerName Provider name.
   * @param {string} data.service Service name for standard provider.
   * @param {boolean} data.sendFile Send file indicator for standard provider.
   * @param {string} data.workflowId Workflow ID.
   * @param {DocumentEntity[]} data.documents Documents.
   * @param {DocumentEntity} data.document Main document.
   * @param {EventEntity} data.event Main event.
   * @param {DocumentEntity[]} data.additionalDocuments Additional documents.
   * @param {object} data.documentTemplateId Document template ID.
   * @param {Filestorage} data.filestorage Filestorage library.
   * @param {object} data.taskModel Task model.
   * @param {object} data.documentModel Document model.
   * @param {DocumentAttachmentModel} data.documentAttachmentModel Document attachment model.
   * @param {object} data.eventModel Event model.
   * @param {DocumentEntity} data.document Document defined by template ID.
   * @param {'(documents) => []'} data.fileIds File IDs function.
   * @param {'(documents) => []'} data.p7sFileIds P7S file IDs function.
   * @returns {Promise<object>} Data to send promise.
   */
  async transform(data) {
    // Get params.
    const {
      workflowId,
      document,
      event,
      documents,
      events,
      options,
      filestorage,
      service,
      sendFile,
      fileIds: fileIdsFunction = '() => [];',
      p7sFileIds: p7sFileIdsFunction = '() => [];',
      sendAdditionalDataSignatures = false,
      additionalDataSignatureIndex,
      additionalDataSignatureFilter,
      responseFile = null,
      saveBase64Logs = false,
    } = data;
    const { id: documentId, fileId, data: documentData } = document || {};
    const { id: eventId, data: eventData } = event || {};
    const { preparedData } = documentData || {};
    const fileIds = this.sandbox.evalWithArgs(
      fileIdsFunction,
      [document, event, documents, events],
      { meta: { fn: 'fileIds', caller: 'DecoratorStandard.transformExternalServiceData' } },
    );
    const p7sFileIds = this.sandbox.evalWithArgs(
      p7sFileIdsFunction,
      [document, event, documents, events],
      { meta: { fn: 'p7sFileIds', caller: 'DecoratorStandard.transformExternalServiceData' } },
    );

    // Process options data with sandbox evaluation
    let optionsData;
    if (options) {
      optionsData = {};
      const getAdditionalSignatures = this.getAdditionalSignatures.bind(this, documentId);
      const sign = this.sign.bind(this);
      const toBase64 = this.toBase64.bind(this);
      const getFileBase64 = this.getFileBase64.bind(this, filestorage);

      for (const key of Object.keys(options)) {
        optionsData[key] = await this.sandbox.evalWithArgs(
          options[key],
          [document, event, documents, events],
          {
            isAsync: true,
            global: { getAdditionalSignatures, sign, toBase64, getFileBase64 },
            meta: { fn: options[key], caller: 'DecoratorStandard.transform' },
          },
        );
      }
    }

    // Get P7S.
    let fileP7s;
    if (sendFile) {
      const p7sInfo = await filestorage.getP7sSignature(fileId);
      const { p7s = '' } = p7sInfo || {};
      fileP7s = p7s;
    }

    // Get files.
    const files = await this.getFiles(filestorage, fileIds, p7sFileIds);

    // Get additional signatures.
    let additionalSignatures;
    if (sendAdditionalDataSignatures) {
      const additionalDataSignatures = await models.additionalDataSignature.getByDocumentId(documentId, 'asc');
      if (typeOf(additionalDataSignatureIndex) === 'string' && global.typeOf(additionalDataSignatureFilter) === 'string') {
        throw new Error(
          'DecoratorStandard.transform. additionalDataSignatureIndex and additionalDataSignatureFilter cannot be used at the same time.',
        );
      }
      if (typeOf(additionalDataSignatureIndex) === 'string') {
        let index;
        try {
          index = this.sandbox.evalWithArgs(
            additionalDataSignatureIndex,
            [documents],
            { meta: { fn: 'additionalDataSignatureIndex', caller: 'DecoratorStandard.transformExternalServiceData' } },
          );
        } catch (error) {
          throw new Error(`DecoratorStandard.transform. additionalDataSignatureIndex function throw error. ${error.toString()}`);
        }
        additionalSignatures = [additionalDataSignatures[index].signature];
      } else if (typeOf(additionalDataSignatureFilter) === 'string') {
        let filteredAdditionalSignatures;
        try {
          filteredAdditionalSignatures = this.sandbox.evalWithArgs(
            additionalDataSignatureFilter,
            [documents, additionalDataSignatures],
            { meta: { fn: 'additionalDataSignatureFilter', caller: 'DecoratorStandard.transform' } },
          );
        } catch (error) {
          throw new Error(`DecoratorStandard.transform. additionalDataSignatureFilter function throw error. ${error.toString()}`);
        }
        if (typeOf(filteredAdditionalSignatures) !== 'array') {
          throw new Error('DecoratorStandard.transform. additionalDataSignatureFilter function should return an array.');
        }
        additionalSignatures = filteredAdditionalSignatures.map((v) => v.signature);
      } else {
        additionalSignatures = additionalDataSignatures.map((v) => v.signature);
      }
    }

    // Define and return transformed data.
    const body = {
      ...(preparedData || {
        workflowId,
        documentId,
        eventId,
        data: optionsData || documentData || eventData,
      }),
      fileP7s,
      ...(files.length && { files }),
      additionalSignatures,
    };
    let transformedData = {
      body,
      destination: {
        service,
      },
      responseFile,
      workflowId,
      documentId,
      eventId,
      saveBase64Logs,
    };
    return transformedData;
  }

  /**
   * Get files.
   * @param {Filestorage} filestorage Filestorage service.
   * @param {string[]} fileIds File IDs list.
   * @param {string[]} p7sFileIds P7S file IDs list.
   * @returns {Promise<{name, contentType, fileContent}[]>} Files data.
   */
  async getFiles(filestorage, fileIds, p7sFileIds) {
    // Files container.
    let files = [];

    // Get P7S files.
    for (const p7sFileId of p7sFileIds) {
      const p7sInfo = await filestorage.getFile(p7sFileId, true);
      const { name, contentType, fileContent } = p7sInfo;
      files.push({ name, contentType, fileContent });
    }

    // Get files.
    for (const fileId of fileIds) {
      const fileInfo = await filestorage.getFile(fileId);
      files.push(fileInfo);
    }

    // Return files.
    return files;
  }

  /**
   * Get additional signatures.
   * @private
   * @param {string} documentId Document ID.
   * @returns {string}
   */
  async getAdditionalSignatures(documentId) {
    return await models.additionalDataSignature.getByDocumentId(documentId);
  }

  /**
   * Sign.
   * @private
   * @param {string} data Data.
   * @returns {string}
   */
  async sign(data) {
    const sign = new Sign();
    const response = await sign.sign(data);
    return response && response.data;
  }

  /**
   * To base64.
   * @private
   * @param {string} data Data.
   * @returns {string}
   */
  toBase64(data) {
    const base64 = Buffer.from(data).toString('base64');

    return base64;
  }

  /**
   * Get file base64.
   * @private
   * @param {string} fileId File ID.
   * @returns {string}
   */
  async getFileBase64(filestorage, fileId) {
    const file = await filestorage.downloadFileWithoutStream(fileId);
    if (!file) {
      return;
    }

    return file.toString('base64');
  }

  /**
   * Transform function to async.
   * @private
   * @param {string} functionString Function string.
   * @param {array} [allowedAsyncFunctions] Allowed async functions.
   * @returns {string} Async function string.
   */
  transformFunctionToAsync(functionString, allowedAsyncFunctions = []) {
    // Define params.
    const isFunctionStringContainsAsyncFunction = allowedAsyncFunctions.some(
      (v) => functionString.includes(v) && !functionString.includes(`await ${v}`),
    );

    // Return as is if async function not used.
    if (!isFunctionStringContainsAsyncFunction) {
      return functionString;
    }

    // Transform to async.
    let asyncFunctionString = functionString;
    if (!asyncFunctionString.startsWith('async')) {
      asyncFunctionString = `async ${asyncFunctionString}`;
    }
    for (const asyncFunctionInside of allowedAsyncFunctions) {
      asyncFunctionString = asyncFunctionString.replace(new RegExp(asyncFunctionInside, 'g'), `await ${asyncFunctionInside}`);
    }

    // Return transformed function.
    return asyncFunctionString;
  }
}

module.exports = DecoratorStandard;
