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
   * @param {string} options.certificate Certificate.
   * @param {string} options.createdBy Created by.
   *
   */
  constructor({ id, documentId, signature, certificate, createdBy, type, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.documentId = documentId;
    this.signature = signature;
    this.certificate = certificate;
    this.type = type;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  getFilterProperties() {
    return ['id', 'documentId', 'signature', 'certificate', 'createdBy'];
  }

  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}

module.exports = DocumentSignatureEntity;
