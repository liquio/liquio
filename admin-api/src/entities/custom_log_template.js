const Entity = require('./entity');

/**
 * Custom log template entity.
 */
class CustomLogTemplateEntity extends Entity {
  /**
   * Custom log template entity constructor.
   * @param {object} options Custom log template object.
   * @param {number} options.id ID.
   * @param {number} options.name Name.
   * @param {string} options.[documentTemplateId] Document template ID.
   * @param {'read-document'|'create-document'|'update-document'|'delete-document'|'add-attach'|'remove-attach'|'generate-pdf'|'sign'|'commit'} options.operationType Operation type.
   * @param {string} options.schema Schema.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, name, documentTemplateId, operationType, schema, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.name = name;
    this.documentTemplateId = documentTemplateId;
    this.operationType = operationType;
    this.schema = schema;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = CustomLogTemplateEntity;
