const Entity = require('./entity');

/**
 * Number template entity.
 */
class NumberTemplateEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Number template object.
   * @param {number} options.id ID.
   * @param {string} options.name Name.
   * @param {string} options.template Template.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({ id, name, template, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.name = name;
    this.template = template;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = NumberTemplateEntity;
