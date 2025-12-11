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
   * @param {string} options.jsonSchema JSON Schema.
   * @param {string} options.htmlTemplate HTML template.
   */
  constructor({ id, eventTypeId, name, description, jsonSchema, htmlTemplate }) {
    super();

    this.id = id;
    this.eventTypeId = eventTypeId;
    this.name = name;
    this.description = description;
    this.jsonSchema = jsonSchema;
    this.htmlTemplate = htmlTemplate;
  }
}

module.exports = EventTemplateEntity;
