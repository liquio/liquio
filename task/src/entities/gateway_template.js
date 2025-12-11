
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
   * @param {object} options.jsonSchema JSON Schema.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({ id, gatewayTypeId, name, description, jsonSchema, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.gatewayTypeId = gatewayTypeId;
    this.name = name;
    this.description = description;
    this.jsonSchema = jsonSchema;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = GatewayTemplateEntity;
