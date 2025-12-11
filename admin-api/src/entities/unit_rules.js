const Entity = require('./entity');

/**
 * User inbox entity.
 */
class UnitRulesEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Document object.
   * @param {string} options.type User ID.
   * @param {string} options.ruleSchema Document ID.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ type, ruleSchema }) {
    super();

    this.type = type;
    this.ruleSchema = ruleSchema;
  }
}

module.exports = UnitRulesEntity;
