import { Entity } from './entity';

interface EventEntityOptions {
  /** ID. */
  id: string;
  /** Event template ID. */
  eventTemplateId: number;
  /** Event type ID. */
  eventTypeId: number;
  /** Workflow ID. */
  workflowId: string;
  /** Cancellation type ID. */
  cancellationTypeId: string;
  /** Name. */
  name: string;
  /** Done. */
  done: boolean;
  /** Created by. */
  createdBy: string;
  /** Updated by. */
  updatedBy: string;
  /** Data. */
  data: object;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
  /** Document ID. */
  documentId: string;
  /** Due date. */
  dueDate: Date;
}

/**
 * Event entity.
 */
export class EventEntity extends Entity<EventEntityOptions> { }

export interface EventEntity extends EventEntityOptions { }
