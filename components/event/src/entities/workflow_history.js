const Entity = require('./entity');

/**
 * Workflow history entity.
 */
class WorkflowHistoryEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Workflow history object.
   * @param {string} options.id ID.
   * @param {string} options.workflowTemplateId Workflow template ID.
   * @param {string} options.userId User ID.
   * @param {object} options.data Data.
   * @param {string} options.version Version.
   * @param {boolean} options.isCurrentVersion Current version.
   * @param {object} options.meta Meta.
   * @param {string} options.name Name.
   * @param {string} options.description Description.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, workflowTemplateId, userId, data, version, isCurrentVersion, meta, name, description, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.workflowTemplateId = workflowTemplateId;
    this.userId = userId;
    this.data = data;
    this.version = version;
    this.isCurrentVersion = isCurrentVersion;
    this.meta = meta;
    this.name = name;
    this.description = description;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = WorkflowHistoryEntity;
