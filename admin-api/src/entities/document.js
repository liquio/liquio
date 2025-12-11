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
   * @param {string} options.createdBy Created by.
   * @param {string} options.updatedBy Updated by.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   * @param {object} options.data Data.
   * @param {string} options.description Description.
   * @param {string} options.fileId File ID.
   * @param {string} options.fileName File name.
   * @param {string} options.fileType File type.
   * @param {string} options.signatures Signatures.
   * @param {string} options.signatureRejections Signature rejections.
   * @param {{asicmanifestFileId, filesIds}} options.asic ASIC info.
   * @param {DocumentAttachmentEntity[]} [options.attachments] Attachments.
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
    createdAt,
    updatedAt,
    data,
    description,
    fileId,
    fileName,
    fileType,
    signatures,
    signatureRejections,
    asic,
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
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.data = data;
    this.description = description;
    this.fileId = fileId;
    this.fileName = fileName;
    this.fileType = fileType;
    this.signatures = signatures;
    this.signatureRejections = signatureRejections;
    this.asic = asic;
    this.attachments = attachments;
  }

  getFilterProperties() {
    return [
      'id',
      'externalId',
      'parentId',
      'documentTemplateId',
      'documentStateId',
      'cancellationTypeId',
      'number',
      'isFinal',
      'ownerId',
      'createdBy',
      'updatedBy',
      'createdAt',
      'updatedAt',
      'data',
      'description',
      'fileId',
      'fileName',
      'fileType',
      'signatures',
      'signatureRejections',
      'asic',
      'attachments',
    ];
  }

  getFilterPropertiesBrief() {
    return [
      'id',
      'externalId',
      'parentId',
      'documentTemplateId',
      'documentStateId',
      'cancellationTypeId',
      'number',
      'isFinal',
      'ownerId',
      'createdBy',
      'updatedBy',
      'createdAt',
      'updatedAt',
      'description',
      'fileid',
      'fileName',
      'fileType',
      'signatures',
      'signatureRejections',
      'asic',
      'attachments',
    ];
  }
}

module.exports = DocumentEntity;
