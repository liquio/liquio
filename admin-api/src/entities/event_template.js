const Entity = require('./entity');

/**
 * Event template entity.
 */
class EventTemplateEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Event template object.
   * @param {number} options.id ID.
   * @param {nubmer} options.eventTypeId Event type ID.
   * @param {string} options.name Name.
   * @param {string} options.description Status.
   * @param {object} options.jsonSchema JSON Schema.
   * @param {string} options.jsonSchemaRaw JSON Schema raw.
   * @param {string} options.htmlTemplate HTML template.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({ id, eventTypeId, name, description, jsonSchema, jsonSchemaRaw, htmlTemplate, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.eventTypeId = eventTypeId;
    this.name = name;
    this.description = description;
    this.jsonSchema = jsonSchema;
    this.jsonSchemaRaw = jsonSchemaRaw;
    this.htmlTemplate = htmlTemplate;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = EventTemplateEntity;
