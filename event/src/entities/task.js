const Entity = require('./entity');

/**
 * Task entity.
 * @typedef {import('./document')} DocumentEntity
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
   * @param {DocumentEntity} options.document Document Entity.
   * @param {string[]} options.signerUsers Signer user IDs.
   * @param {string[]} options.performerUsers Performer user IDs.
   * @param {string[]} options.performerUsersIpn Performer users IPN.
   * @param {string[]} options.performerUsersEmail Performer users email.
   * @param {string[]} options.performerUserNames Performer usernames.
   * @param {string[]} options.performerUnits Performer unit IDs.
   * @param {number[]} options.tags Tag IDs.
   * @param {object} options.data Data object.
   * @param {number} options.cancellationTypeId Cancellation type ID.
   * @param {boolean} options.finished Finished.
   * @param {Date} options.finishedAt Finished at.
   * @param {boolean} options.deleted Deleted.
   * @param {string} options.createdBy Created by.
   * @param {string} options.updatedBy Updated by.
   * @param {Date} options.dueDate Due date.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   * @param {Object} options.meta Updated at.
   * @param {boolean} options.isSystem Is system.
   */
  constructor({
    id,
    workflowId,
    name,
    description,
    taskTemplateId,
    documentId,
    document,
    signerUsers,
    performerUsers,
    performerUsersIpn,
    performerUsersEmail,
    performerUserNames,
    performerUnits,
    tags,
    data,
    cancellationTypeId,
    finished,
    finishedAt,
    deleted,
    createdBy,
    updatedBy,
    dueDate,
    createdAt,
    updatedAt,
    meta,
    isSystem,
  }) {
    super();

    this.id = id;
    this.workflowId = workflowId;
    this.name = name;
    this.description = description;
    this.taskTemplateId = taskTemplateId;
    this.documentId = documentId;
    this.document = document;
    this.signerUsers = signerUsers;
    this.performerUsers = performerUsers;
    this.performerUsersIpn = performerUsersIpn;
    this.performerUsersEmail = performerUsersEmail;
    this.performerUserNames = performerUserNames;
    this.performerUnits = performerUnits;
    this.tags = tags;
    this.data = data;
    this.cancellationTypeId = cancellationTypeId;
    this.finished = finished;
    this.finishedAt = finishedAt;
    this.deleted = deleted;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.dueDate = dueDate;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.meta = meta;
    this.isSystem = isSystem;
  }
}

module.exports = TaskEntity;
