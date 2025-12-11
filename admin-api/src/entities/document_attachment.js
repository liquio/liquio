const Entity = require('./entity');

/**
 * Document attachment entity.
 */
class DocumentAttachmentEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Document attachment object.
   * @param {string} options.id ID.
   * @param {string} options.documentId Document ID.
   * @param {string} options.link Link.
   * @param {string} options.name Name.
   * @param {string} options.type Type.
   * @param {number} options.size Size.
   * @param {boolean} options.isGenerated Is generated.
   * @param {Date} options.createdAt Created at.
   */
  constructor({ id, documentId, link, name, type, size, isGenerated, createdAt }) {
    super();

    this.id = id;
    this.documentId = documentId;
    this.link = link;
    this.name = name;
    this.type = type;
    this.size = size;
    this.isGenerated = isGenerated;
    this.createdAt = createdAt;
  }

  getFilterProperties() {
    return ['id', 'documentId', 'link', 'name', 'type', 'size', 'isGenerated', 'createdAt'];
  }

  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}

module.exports = DocumentAttachmentEntity;
