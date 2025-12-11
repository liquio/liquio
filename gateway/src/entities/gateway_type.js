const Entity = require('./entity');

// Types.
const TYPES = {
  Parallel: 'parallel',
  Exclusive: 'exclusive',
  Inclusive: 'inclusive',
};

/**
 * Gateway taype entity.
 */
class GatewayTypeEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Gateway type object.
   * @param {number} options.id ID.
   * @param {string} options.name Name.
   */
  constructor({ id, name }) {
    super();

    this.id = id;
    this.name = name && name.trim().toLowerCase();
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
