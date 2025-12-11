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
   * @param {Date} options.updatedAt Updated at.
   * @param {object} [options.userData] User data.
   * @param {boolean} [options.hasUnresolvedErrors] Has unresolved errors.
   * @param {object} options.statuses Statuses.
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
    updatedAt,
    userData,
    hasUnresolvedErrors,
    statuses,
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
    this.updatedAt = updatedAt;
    this.userData = userData;
    this.hasUnresolvedErrors = hasUnresolvedErrors;
    this.statuses = statuses;
  }
}

module.exports = WorkflowEntity;
