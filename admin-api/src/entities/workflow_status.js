const Entity = require('./entity');

/**
 * Workflow status entity.
 */
class WorkflowStatusEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Workflow status object.
   * @param {number} options.id ID.
   * @param {string} options.name Name.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, name, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.name = name;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  getFilterProperties() {
    return ['id', 'name', 'createdAt', 'updatedAt'];
  }

  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}

module.exports = WorkflowStatusEntity;
