
const Entity = require('./entity');

/**
 * Document signature rejection entity.
 */
class DocumentSignatureRejectionEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Document object.
   * @param {string} options.id ID.
   * @param {string} options.documentId Document ID.
   * @param {string} options.userId User ID.
   * @param {object} options.data Data.
   * @param {string} options.createdAt Created at.
   * @param {string} options.createdBy Created by.
   */
  constructor({ id, documentId, userId, data, createdAt, createdBy }) {
    super();

    this.id = id;
    this.documentId = documentId;
    this.userId = userId;
    this.data = data;
    this.createdAt = createdAt;
    this.createdBy = createdBy;
  }

  /**
   * Get filter properties.
   */
  getFilterProperties() {
    return ['id', 'documentId', 'userId', 'data', 'createdAt', 'createdBy'];
  }

  /**
   * Get filter properties brief.
   */
  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}

module.exports = DocumentSignatureRejectionEntity;
