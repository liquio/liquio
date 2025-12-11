const Entity = require('./entity');

/**
 * Document entity.
 */
class DocumentEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Document object.
   * @param {string} options.id ID.
   * @param {string} [options.externalId] External ID.
   * @param {string} options.parentId Parent ID.
   * @param {number} options.documentTemplateId Document template ID.
   * @param {number} options.documentStateId Document state ID.
   * @param {number} options.cancellationTypeId Cancellation type ID.
   * @param {number} options.number Number.
   * @param {boolean} options.isFinal Final status.
   * @param {string} options.ownerId Owner ID.
   * @param {string} options.createdBy Created By.
   * @param {string} options.updatedBy Updated By.
   * @param {object} options.data Data.
   * @param {string} options.description Description.
   * @param {string} options.fileName File name.
   * @param {string} options.fileType File type.
   * @param {Array<Object>} options.attachments Attachments.
   */
  constructor({
    id,
    externalId,
    parentId,
    documentTemplateId,
    documentStateId,
    cancellationTypeId,
    number,
    isFinal,
    ownerId,
    createdBy,
    updatedBy,
    data,
    description,
    fileName,
    fileType,
    attachments,
  }) {
    super();

    this.id = id;
    this.externalId = externalId;
    this.parentId = parentId;
    this.documentTemplateId = documentTemplateId;
    this.documentStateId = documentStateId;
    this.cancellationTypeId = cancellationTypeId;
    this.number = number;
    this.isFinal = isFinal;
    this.ownerId = ownerId;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.data = data;
    this.description = description;
    this.fileName = fileName;
    this.fileType = fileType;
    this.attachments = attachments;
  }
}

module.exports = DocumentEntity;
