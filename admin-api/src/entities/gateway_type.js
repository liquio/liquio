const Entity = require('./entity');

// Types.
const TYPES = {
  Parallel: 'parallel',
  Exclusive: 'exclusive',
  Inclusive: 'inclusive',
};

/**
 * Gateway type entity.
 */
class GatewayTypeEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Gateway type object.
   * @param {number} options.id ID.
   * @param {string} options.name Name.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({ id, name, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.name = name && name.trim().toLowerCase();
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Types.
   * @returns {typeof TYPES}
   */
  static get Types() {
    return TYPES;
  }

  /**
   * Is Parallel indicator.
   * @returns {boolean}
   */
  get isParallel() {
    return this.name === GatewayTypeEntity.Types.Parallel;
  }

  /**
   * Is Exclusive indicator.
   * @returns {boolean}
   */
  get isExclusive() {
    return this.name === GatewayTypeEntity.Types.Exclusive;
  }

  /**
   * Is Inclusive indicator.
   * @returns {boolean}
   */
  get isInclusive() {
    return this.name === GatewayTypeEntity.Types.Inclusive;
  }
}

module.exports = GatewayTypeEntity;
