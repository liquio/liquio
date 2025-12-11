
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
   * @param {string} options.htmlTemplate Html template.
   */
  constructor({ id, name, documentTemplateId, jsonSchema, htmlTemplate }) {
    super();

    this.id = id;
    this.name = name;
    this.documentTemplateId = documentTemplateId;
    this.jsonSchema = jsonSchema;
    this.htmlTemplate = htmlTemplate;
  }

  getFilterProperties() {
    return ['id', 'name', 'documentTemplateId', 'jsonSchema', 'htmlTemplate'];
  }

  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}

module.exports = TaskTemplateEntity;
