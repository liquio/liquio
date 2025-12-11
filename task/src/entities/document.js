
const Entity = require('./entity');
const DocumentTemplateEntity = require('./document_template');
const Sandbox = require('../lib/sandbox');

/**
 * Document entity.
 */
class DocumentEntity extends Entity {
  static sandbox = new Sandbox();

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
   * @param {DocumentTemplateEntity} [options.documentTemplate] Document template.
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
    documentTemplate
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
    this.documentTemplate = documentTemplate;
    this.calculatedGetters = [];
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
      'calculatedGetters'
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
      'attachments'
    ];
  }

  /**
   * Calc getters.
   * @throws {Error} Throws error if document template is not an instance of DocumentTemplateEntity.
   * @throws {Error} Throws error if getter function is not defined.
   */
  calcGetters() {
    // Check document template.
    if (!(this.documentTemplate instanceof DocumentTemplateEntity)) {
      throw new Error('Document template is not an instance of DocumentTemplateEntity.');
    }

    // Find getter control in document template.
    // Sample: `{ "control": "getter" }`.
    const { jsonSchema } = this.documentTemplate;
    if (jsonSchema.properties) {
      const stepNames = Object.keys(jsonSchema.properties);
      for (const stepName of stepNames) {
        const step = jsonSchema.properties[stepName];
        const controlNames = step.properties ? Object.keys(step.properties) : [];
        for (const controlName of controlNames) {
          const control = step.properties[controlName];
          if (control.control === 'getter') {
            // Get getter value.
            const getterCurrentValue = this.data[stepName] && this.data[stepName][controlName];
            const getterFunctionString = control.value;
            if (!getterFunctionString) {
              throw new Error(
                `Getter function is not defined for control ${stepName}.${controlName}.`
              );
            }
            const getterFunction = DocumentEntity.sandbox.eval(control.value);
            const stepData = this.data[stepName] || {};
            if (Object.keys(this.data).length > 0) {
              const getterValue = getterFunction(getterCurrentValue, stepData, this.data);

              // Set getter value.
              if (!this.data[stepName]) {
                this.data[stepName] = {};
              }
              this.data[stepName][controlName] = getterValue;
              this.calculatedGetters.push(`${stepName}.${controlName}`);
            }
          }
        }
      }
    }
  }
}

module.exports = DocumentEntity;
