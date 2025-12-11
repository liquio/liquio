
const Entity = require('./entity');

/**
 * Document update log entity.
 */
class DocumentUpdateLogEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Document update log object.
   * @param {string} options.documentId Document ID.
   * @param {Date} options.createdAt Created at.
   * @param {string} options.userId User ID.
   * @param {{path: string, value}[]} options.changes Changes list.
   */
  constructor({ documentId, createdAt, userId, changes }) {
    super();

    this.documentId = documentId;
    this.createdAt = new Date(createdAt);
    this.userId = userId;
    this.changes = changes;
    this.id = this.getId();
  }

  /**
   * Get filter properties.
   * @returns {string[]} Filter properties.
   */
  getFilterProperties() {
    return ['id', 'documentId', 'createdAt', 'userId', 'changes'];
  }

  /**
   * Get filter properties brief.
   * @returns {string[]} Filter properties.
   */
  getFilterPropertiesBrief() {
    return ['id', 'documentId', 'createdAt', 'userId'];
  }

  /**
   * Get ID.
   * @private
   * @returns {string} Document updated log ID. Format: `d.<document-id>.<user-id>.<timestamp>`.
   */
  getId() {
    return `d.${this.documentId}.${this.userId}.${+new Date(this.createdAt)}`;
  }

  /**
   * Get ID search pattern.
   * @param {string} documentId Document ID.
   * @returns {string} Document updated log ID search pattern. Format: `d.<document-id>.*`.
   */
  static getIdSearchPattern(documentId) {
    return `d.${documentId}.*`;
  }
}

module.exports = DocumentUpdateLogEntity;
