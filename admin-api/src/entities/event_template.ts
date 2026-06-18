import { Entity } from './entity';

interface EventTemplateEntityOptions {
  /** ID. */
  id: number;
  /** Event type ID. */
  eventTypeId: number;
  /** Name. */
  name: string;
  /** Status. */
  description: string;
  /** JSON Schema. */
  jsonSchema: object;
  /** JSON Schema raw. */
  jsonSchemaRaw: string;
  /** HTML template. */
  htmlTemplate: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Event template entity.
 */
export class EventTemplateEntity extends Entity<EventTemplateEntityOptions> { }

export interface EventTemplateEntity extends EventTemplateEntityOptions { }
