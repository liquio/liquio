const Entity = require('./entity');

/**
 * Task entity.
 */
class TaskEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Task object.
   * @param {string} options.id ID.
   * @param {string} option.workflowId Workflow ID.
   * @param {string} options.name Name.
   * @param {string} options.description Description.
   * @param {number} options.taskTemplateId Task template ID.
   * @param {string} options.documentId Document ID.
   * @param {string[]} options.signerUsers Signer user IDs.
   * @param {string[]} options.performerUsers Performer user IDs.
   * @param {string[]} options.performerUnits Performer unit IDs.
   * @param {number[]} options.tags Tag IDs.
   * @param {object} options.data Data object.
   * @param {number} options.cancellationTypeId Cancellation type ID.
   * @param {boolean} options.finished Finished.
   * @param {string} options.createdBy Created by.
   * @param {string} options.updatedBy Updated by.
   * @param {Date} options.dueDate Due date.
   */
  constructor({
    id,
    workflowId,
    name,
    description,
    taskTemplateId,
    documentId,
    signerUsers,
    performerUsers,
    performerUnits,
    tags,
    data,
    cancellationTypeId,
    finished,
    createdBy,
    updatedBy,
    dueDate,
  }) {
    super();

    this.id = id;
    this.workflowId = workflowId;
    this.name = name;
    this.description = description;
    this.taskTemplateId = taskTemplateId;
    this.documentId = documentId;
    this.signerUsers = signerUsers;
    this.performerUsers = performerUsers;
    this.performerUnits = performerUnits;
    this.tags = tags;
    this.data = data;
    this.cancellationTypeID = cancellationTypeId;
    this.finished = finished;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.dueDate = dueDate;
  }
}

module.exports = TaskEntity;
