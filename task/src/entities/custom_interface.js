
const Entity = require('./entity');

/**
 * Custom interface entity.
 */
class CustomInterfaceEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Custom interface object.
   * @param {number} options.id ID.
   * @param {string} options.name Name.
   * @param {string} options.route Route.
   * @param {boolean} options.isActive Is active.
   * @param {string} options.interfaceSchema Interface schema.
   * @param {number[]} options.units Units.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, name, route, isActive, interfaceSchema, units, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.name = name;
    this.route = route;
    this.isActive = isActive;
    this.interfaceSchema = interfaceSchema;
    this.units = units || [];
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = CustomInterfaceEntity;
