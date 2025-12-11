
const Entity = require('./entity');

// Constants.
const TYPES = Object.freeze({ register: 'register' });

/**
 * Unit access entity.
 */
class UnitAccessEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Unit access object.
   * @param {number} options.id ID.
   * @param {number} options.unitId Unit ID.
   * @param {string} options.type Unit access type.
   * @param {object} options.data Data.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   * @param {object} options.meta Meta.
   */
  constructor({ id, unitId, type, data, createdAt, updatedAt, meta }) {
    super();

    this.id = id;
    this.unitId = unitId;
    this.type = type;
    this.data = data;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.meta = meta;
  }

  /**
   * Types.
   * @returns {TYPES} Unit access types.
   */
  static get Types() { return TYPES; }
}

module.exports = UnitAccessEntity;
