/**
 * Decorator.
 */
const Sandbox = require('../../../../../lib/sandbox');

class Decorator {
  constructor() {
    this.sandbox = Sandbox.getInstance();
  }

  /**
   * Transform.
   * @abstract
   * @param {object} data Data to transform.
   * @param {string} data.providerName Provider name.
   * @param {DocumentEntity[]} data.documents Documents.
   * @param {DocumentEntity} data.document Main document.
   * @param {DocumentEntity[]} data.additionalDocuments Additional documents.
   * @param {object} data.documentTemplateId Document template ID.
   * @param {object} data.filestorage Filestorage library.
   * @param {object} data.taskModel Task model.
   * @param {object} data.documentModel Document model.
   * @param {object} data.eventModel Event model.
   * @param {object} data.document Document defined by template ID.
   * @returns {Promise<object>} Data to send promise.
   */
  // eslint-disable-next-line no-unused-vars
  async transform(data) {
    throw new Error('Method should be defined in specific decorator.');
  }
}

module.exports = Decorator;
