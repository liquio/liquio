import { Entity } from './entity';

/**
 * Event template entity.
 */
export class EventTemplateEntity extends Entity {
  id: any;
  eventTypeId: any;
  name: any;
  description: any;
  jsonSchema: any;
  htmlTemplate: any;

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
  constructor({ id, eventTypeId, name, description, jsonSchema, htmlTemplate }: any) {
    super();

    this.id = id;
    this.eventTypeId = eventTypeId;
    this.name = name;
    this.description = description;
    this.jsonSchema = jsonSchema;
    this.htmlTemplate = htmlTemplate;
  }
}
