const Entity = require('./entity');

/**
 * Task template entity.
 */
class TaskTemplateEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Task template object.
   * @param {number} options.id ID.
   * @param {string} options.name Name.
   * @param {number} options.documentTemplateId Document template ID.
   * @param {object} options.jsonSchema Json schema.
   * @param {string} options.jsonSchemaRaw Json schema raw.
   * @param {string} options.htmlTemplate Html template.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({ id, name, documentTemplateId, jsonSchema, jsonSchemaRaw, htmlTemplate, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.name = name;
    this.documentTemplateId = documentTemplateId;
    this.jsonSchema = jsonSchema;
    this.jsonSchemaRaw = jsonSchemaRaw;
    this.htmlTemplate = htmlTemplate;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  getFilterProperties() {
    return ['id', 'name', 'documentTemplateId', 'jsonSchema', 'htmlTemplate'];
  }

  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}

module.exports = TaskTemplateEntity;
