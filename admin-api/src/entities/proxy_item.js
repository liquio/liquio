const Entity = require('./entity');

/**
 * Document template entity.
 */
class ProxyItemEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Document template object.
   * @param {number} options.id ID.
   * @param {string} options.name Name.
   * @param {object} options.data JSON data.
   * @param {number[]} options.accessUnits Access units list.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({ id, name, data, accessUnits, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.name = name;
    this.data = data;
    this.accessUnits = accessUnits;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  getFilterProperties() {
    return ['id', 'name', 'data', 'accessUnits', 'createdAt', 'updatedAt'];
  }

  getFilterPropertiesBrief() {
    return ['id', 'name', 'data', 'accessUnits', 'createdAt', 'updatedAt'];
  }
}

module.exports = ProxyItemEntity;
