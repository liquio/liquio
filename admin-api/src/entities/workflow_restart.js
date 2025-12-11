const Entity = require('./entity');

/**
 * Workflow restart entity.
 */
class WorkflowRestartEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Workflow restart object.
   * @param {number} options.id ID.
   * @param {string} options.workflowId Workflow ID.
   * @param {number} options.workflowErrorId Workflow error ID.
   * @param {string} options.type Type.
   * @param {object} options.data Data.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, workflowId, workflowErrorId, type, data, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.workflowId = workflowId;
    this.workflowErrorId = workflowErrorId;
    this.type = type;
    this.data = data;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = WorkflowRestartEntity;
