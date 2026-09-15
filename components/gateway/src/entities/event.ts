import { Entity } from './entity';

/**
 * Event entity.
 */
export class EventEntity extends Entity {
  id: string;
  eventTemplateId: number;
  eventTypeId: number;
  workflowId: string;
  cancellationTypeId: string;
  name: string;
  done: boolean;
  createdBy: string;
  updatedBy: string;
  data: any;
  createdAt: Date;
  updatedAt: Date;
  documentId: any;

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
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   * @param {object} options.documentId Document ID.
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
    createdAt,
    updatedAt,
    documentId,
  }: any) {
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
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.documentId = documentId;
  }
}
