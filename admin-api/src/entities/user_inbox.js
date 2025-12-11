const Entity = require('./entity');

/**
 * User inbox entity.
 */
class UserInboxEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Document object.
   * @param {string} options.id ID.
   * @param {string} options.userId User ID.
   * @param {string} options.documentId Document ID.
   * @param {string} options.name Name.
   * @param {string} options.number Number.
   * @param {boolean} options.isRead Is read indicator.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, userId, documentId, name, number, isRead, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.userId = userId;
    this.documentId = documentId;
    this.name = name;
    this.number = number;
    this.isRead = isRead;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Get filter properties.
   * @returns {string[]} Filter properties.
   */
  getFilterProperties() {
    return ['id', 'userId', 'documentId', 'name', 'number', 'isRead', 'createdAt', 'updatedAt'];
  }

  /**
   * Get filter properties brief.
   * @returns {string[]} Filter properties brief.
   */
  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}

module.exports = UserInboxEntity;
