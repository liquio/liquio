const Entity = require('./entity');

/**
 * Document template entity.
 */
class DocumentTemplateEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Document template object.
   * @param {number} options.id ID.
   * @param {string} options.name Name.
   * @param {object} options.jsonSchema JSON schema.
   * @param {string} options.jsonSchemaRaw JSON schema raw.
   * @param {string} options.htmlTemplate Template data.
   * @param {object} options.accessJsonSchema Inboxes JSON schema.
   * @param {string} options.additionalDataToSign Additional data to sign.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({ id, name, jsonSchema, jsonSchemaRaw, htmlTemplate, accessJsonSchema, additionalDataToSign, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.name = name;
    this.jsonSchema = jsonSchema;
    this.jsonSchemaRaw = jsonSchemaRaw;
    this.htmlTemplate = htmlTemplate;
    this.accessJsonSchema = accessJsonSchema;
    this.additionalDataToSign = additionalDataToSign;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  getFilterProperties() {
    return ['id', 'name', 'jsonSchema', 'htmlTemplate', 'accessJsonSchema', 'taskTemplate', 'additionalDataToSign'];
  }

  getFilterPropertiesBrief() {
    return ['id', 'name', 'taskTemplate'];
  }

  /**
   * HTML templates.
   * @returns {string[]} HTML templates list.
   */
  get htmlTemplates() {
    // Check if not exist.
    if (typeof this.htmlTemplate !== 'string') {
      return [];
    }

    // Separate by delimiter and return.
    const { htmlTemplateDelimiter } = global.config.file_generator;
    const htmlTemplates = this.htmlTemplate.split(htmlTemplateDelimiter);
    return htmlTemplates;
  }

  /**
   * Has many HTML templates.
   * @returns {boolean} Has many HTML templates indicator.
   */
  get hasManyHtmlTemplates() {
    // Define if document template contains many HTML templates and return.
    const hasManyHtmlTemplates = this.htmlTemplates.length > 1;
    return hasManyHtmlTemplates;
  }
}

module.exports = DocumentTemplateEntity;
