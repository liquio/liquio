const Decorator = require('./decorator');

/**
 * Decorator standard.
 * @typedef {import('../../../../../entities/document')} DocumentEntity
 * @typedef {import('../../../../../entities/document_attachment')} DocumentAttachmentEntity
 * @typedef {import('../../../../../models/document_attachment')} DocumentAttachmentModel
 * @typedef {import('../../../../../lib/filestorage')} Filestorage
 */
class DecoratorStandardTrembita extends Decorator {
  /**
   * Transform.
   * @param {object} data Data to transform.
   * @param {'standard'} data.providerName Provider name.
   * @param {string} data.service Service name for standard provider.
   * @param {boolean} data.sendFile Send file indicator for standard provider.
   * @param {string} data.workflowId Workflow ID.
   * @param {DocumentEntity[]} data.documents Documents.
   * @param {DocumentEntity} data.document Main document.
   * @param {DocumentEntity[]} data.additionalDocuments Additional documents.
   * @param {object} data.documentTemplateId Document template ID.
   * @param {Filestorage} data.filestorage Filestorage library.
   * @param {object} data.taskModel Task model.
   * @param {object} data.documentModel Document model.
   * @param {DocumentAttachmentModel} data.documentAttachmentModel Document attachment model.
   * @param {object} data.eventModel Event model.
   * @param {DocumentEntity} data.document Document defined by template ID.
   * @returns {Promise<object>} Data to send promise.
   */
  async transform(data) {
    // Get params.
    const { workflowId, document, filestorage, service, sendFile } = data;
    const { id: documentId, fileId } = document;

    // Get P7S.
    let fileP7s;
    if (sendFile) {
      const p7sInfo = await filestorage.getP7sSignature(fileId);
      const { p7s = '' } = p7sInfo || {};
      fileP7s = p7s;
    }

    // Define and return transformed data.
    let transformedData = {
      body: {
        workflowId,
        documentId,
        data: document && document.data,
        fileP7s,
      },
      destination: {
        service,
      },
    };
    return transformedData;
  }
}

module.exports = DecoratorStandardTrembita;
