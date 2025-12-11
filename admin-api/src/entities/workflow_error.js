const Entity = require('./entity');

/**
 * Workflow error entity.
 */
class WorkflowErrorEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Workflow error object.
   * @param {number} options.id ID.
   * @param {string} options.workflowId Workflow ID.
   * @param {string} options.serviceName Service name.
   * @param {string} options.data Data.
   * @param {string} options.type Type.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, workflowId, serviceName, data, type, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.workflowId = workflowId;
    this.serviceName = serviceName;
    this.data = data;
    this.type = type;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  getFilterProperties() {
    return ['id', 'serviceName', 'data', 'createdAt', 'updatedAt'];
  }

  getFilterPropertiesBrief() {
    return this.getFilterProperties();
  }
}

module.exports = WorkflowErrorEntity;
