const Entity = require('./entity');

/**
 * Workflow template category entity.
 */
class WorkflowTemplateCategoryEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Workflow template object.
   * @param {number} options.id ID.
   * @param {number} options.parentId Parent ID.
   * @param {string} options.name Name.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({ id, parentId, name, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.parentId = parentId;
    this.name = name;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  getFilterProperties() {
    return ['id', 'parentId', 'name', 'createdAt', 'updatedAt'];
  }

  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}

module.exports = WorkflowTemplateCategoryEntity;
