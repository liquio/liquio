const Entity = require('./entity');

/**
 * Workflow entity.
 */
class WorkflowEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Workflow object.
   * @param {string} options.id ID.
   * @param {number} options.workflowTemplateId Workflow template ID.
   * @param {string} options.name Name.
   * @param {boolean} options.isFinal Status.
   * @param {number} options.cancellationTypeId Cancellation type ID.
   * @param {string} options.createdBy Created by.
   * @param {string} options.updatedBy Updated by.
   * @param {object} options.data Data.
   * @param {Date} options.dueDate Due date.
   * @param {number} options.workflowStatusId Workflow status ID.
   * @param {string} options.number Number.
   * @param {Date} options.createdAt Created at.
   * @param {object} [options.userData] User data.
   * @param {boolean} [options.hasUnresolvedErrors] Has unresolved errors.
   */
  constructor({
    id,
    workflowTemplateId,
    name,
    isFinal,
    cancellationTypeId,
    createdBy,
    updatedBy,
    data,
    dueDate,
    workflowStatusId,
    number,
    createdAt,
    userData,
    hasUnresolvedErrors,
  }) {
    super();

    this.id = id;
    this.workflowTemplateId = workflowTemplateId;
    this.name = name;
    this.isFinal = isFinal;
    this.cancellationTypeId = cancellationTypeId;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.data = data;
    this.dueDate = dueDate;
    this.workflowStatusId = workflowStatusId;
    this.number = number;
    this.createdAt = createdAt;
    this.userData = userData;
    this.hasUnresolvedErrors = hasUnresolvedErrors;
  }
}

module.exports = WorkflowEntity;
