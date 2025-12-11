const Entity = require('./entity');

/**
 * Workflow template tag entity.
 */
class WorkflowTemplateTagEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Workflow template tag object.
   * @param {number} options.id ID.
   * @param {string} options.color Color.
   * @param {string} options.description Description.
   * @param {string} options.name Name.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   * @param {string} options.createdBy Created by.
   * @param {string} options.updatedBy Updated by.
   */
  constructor({ id, name, color, description, createdAt, updatedAt, createdBy, updatedBy }) {
    super();

    this.id = id;
    this.name = name;
    this.color = color;
    this.description = description;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
  }

  getFilterProperties() {
    return ['id', 'name', 'color', 'description', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'];
  }

  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}

module.exports = WorkflowTemplateTagEntity;
