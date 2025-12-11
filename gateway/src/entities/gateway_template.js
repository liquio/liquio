const Entity = require('./entity');

/**
 * Gateway template entity.
 */
class GatewayTemplateEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Gateway template object.
   * @param {number} options.id ID.
   * @param {nubmer} options.gatewayTypeId Gateway type ID.
   * @param {string} options.name Name.
   * @param {string} options.description Status.
   * @param {string} options.jsonSchema JSON Schema.
   */
  constructor({ id, gatewayTypeId, name, description, jsonSchema }) {
    super();

    this.id = id;
    this.gatewayTypeId = gatewayTypeId;
    this.name = name;
    this.description = description;
    this.jsonSchema = jsonSchema;
  }
}

module.exports = GatewayTemplateEntity;
