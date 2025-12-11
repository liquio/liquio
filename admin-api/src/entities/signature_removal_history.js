const Entity = require('./entity');

/**
 * Document signature removal history entity.
 */
class SignatureRemovalHistoryEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Signature removal history object.
   *
   */
  constructor(item) {
    super();

    this.id = item.id;
    this.signatureId = item.signatureId;
    this.signatureCreatedBy = item.signatureCreatedBy;
    this.signatureCreatedAt = item.signatureCreatedAt;
    this.signatureUpdatedAt = item.signatureUpdatedAt;
    this.p7s = item.p7s;
    this.fileName = item.fileName;
    this.signatureType = item.signatureType;
    this.documentId = item.documentId;
    this.workflowId = item.workflowId;
    this.userId = item.userId;
    this.userName = item.userName;
    this.createdAt = item.createdAt;
  }
}

module.exports = SignatureRemovalHistoryEntity;
