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
   * @param {string[]} options.labels Labels.
   * @param {boolean} options.isGenerated Is generated.
   * @param {boolean} options.isSystem Is system.
   * @param {object} options.meta Meta.
   * @param {Date} options.createdAt Created at.
   */
  constructor({ id, documentId, link, name, type, labels, isGenerated, isSystem, meta, createdAt }) {
    super();

    this.id = id;
    this.documentId = documentId;
    this.link = link;
    this.name = name;
    this.type = type;
    this.labels = labels;
    this.isGenerated = isGenerated;
    this.isSystem = isSystem;
    this.meta = meta;
    this.createdAt = createdAt;
  }
}

module.exports = DocumentAttachmentEntity;
