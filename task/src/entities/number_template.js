
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
   */
  constructor({ id, name, template }) {
    super();

    this.id = id;
    this.name = name;
    this.template = template;
  }
}

module.exports = NumberTemplateEntity;
