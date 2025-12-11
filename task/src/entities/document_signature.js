
const Entity = require('./entity');

/**
 * Document signature entity.
 */
class DocumentSignatureEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Document object.
   * @param {string} options.id ID.
   * @param {string} options.documentId Document ID.
   * @param {string} options.signature Signature.
   * @param {string} options.type Signature type.
   * @param {string} options.certificate Certificate.
   * @param {string} options.createdBy Created by.
   *
   */
  constructor({ id, documentId, signature, type, certificate, createdBy }) {
    super();

    this.id = id;
    this.documentId = documentId;
    this.signature = signature;
    this.type = type;
    this.certificate = certificate;
    this.createdBy = createdBy;
  }

  /**
   * Get filter properties.
   * @returns {string[]} Filter properties.
   */
  getFilterProperties() {
    return ['id', 'documentId', 'signature', 'type', 'certificate', 'createdBy'];
  }

  /**
   * Get filter properties brief.
   * @returns {string[]} Filter properties brief.
   */
  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}

module.exports = DocumentSignatureEntity;
