const Entity = require('./entity');

/**
 * Event entity.
 */
class EventEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Event object.
   * @param {string} options.id ID.
   * @param {number} options.eventTemplateId Event template ID.
   * @param {number} options.eventTypeId Event type ID.
   * @param {string} options.workflowId Workflow ID.
   * @param {string} options.cancellationTypeId Cancellation type ID.
   * @param {string} options.name Name.
   * @param {boolean} options.done Done.
   * @param {string} options.createdBy Created by.
   * @param {string} options.updatedBy Updated by.
   * @param {object} options.data Data.
   * @param {string} options.documentId Document ID.
   * @param {string} options.version Version.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({
    id,
    eventTemplateId,
    eventTypeId,
    workflowId,
    cancellationTypeId,
    name,
    done,
    createdBy,
    updatedBy,
    data,
    documentId,
    version,
    createdAt,
    updatedAt,
  }) {
    super();

    this.id = id;
    this.eventTemplateId = eventTemplateId;
    this.eventTypeId = eventTypeId;
    this.workflowId = workflowId;
    this.cancellationTypeId = cancellationTypeId;
    this.name = name;
    this.done = done;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.data = data;
    this.documentId = documentId;
    this.version = version;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = EventEntity;
