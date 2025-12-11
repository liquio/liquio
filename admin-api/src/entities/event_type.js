const Entity = require('./entity');

/**
 * Event type entity.
 */
class EventTypeEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Event type object.
   * @param {number} options.id ID.
   * @param {string} options.name Name.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({ id, name, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.name = name;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = EventTypeEntity;
