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
   * @param {string[]} options.performerUsersIpn Performer users IPN.
   * @param {string[]} options.performerUnits Performer unit IDs.
   * @param {number[]} options.tags Tag IDs.
   * @param {object} options.data Data object.
   * @param {number} options.cancellationTypeId Cancellation type ID.
   * @param {boolean} options.finished Finished.
   * @param {boolean} options.deleted Deleted.
   * @param {string} options.createdBy Created by.
   * @param {string} options.updatedBy Updated by.
   * @param {Date} options.dueDate Due date.
   * @param {boolean} options.onlyForHeads Only for heads indicator.
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
    performerUsersIpn,
    performerUnits,
    tags = [],
    data,
    cancellationTypeId,
    finished = false,
    deleted = false,
    createdBy,
    updatedBy,
    dueDate,
    onlyForHeads = false,
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
    this.performerUsersIpn = performerUsersIpn;
    this.performerUnits = performerUnits;
    this.tags = tags || [];
    this.data = data;
    this.cancellationTypeId = cancellationTypeId;
    this.finished = finished || false;
    this.deleted = deleted || false;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.dueDate = dueDate;
    this.onlyForHeads = onlyForHeads || false;
  }
}

module.exports = TaskEntity;
