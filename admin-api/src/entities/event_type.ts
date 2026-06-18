import { Entity } from './entity';

interface EventTypeEntityOptions {
  /** ID. */
  id: number;
  /** Name. */
  name: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Event type entity.
 */
export class EventTypeEntity extends Entity<EventTypeEntityOptions> { }

export interface EventTypeEntity extends EventTypeEntityOptions { }
