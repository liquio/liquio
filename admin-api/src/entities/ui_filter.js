const Entity = require('./entity');

/**
 * UI Filter entity.
 */
class UIFilterEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options UI Filter object.
   * @param {number} options.id ID.
   * @param {string} options.name Name.
   * @param {string} options.filter Filter.
   * @param {boolean} options.isActive Is active.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, name, filter, isActive, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.name = name;
    this.filter = filter;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = UIFilterEntity;
