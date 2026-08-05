const Entity = require('./entity');

/**
 * Event type entity.
 */
class EventTypeEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Event type object.
   * @param {string} options.id ID.
   * @param {string} options.name Name.
   */
  constructor({ id, name }) {
    super();

    this.id = id;
    this.name = name;
  }
}

module.exports = EventTypeEntity;
