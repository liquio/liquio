import { Entity } from './entity';

interface NumberTemplateEntityOptions {
  /** ID. */
  id: number;
  /** Name. */
  name: string;
  /** Template. */
  template: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Number template entity.
 */
export class NumberTemplateEntity extends Entity<NumberTemplateEntityOptions> {}

export interface NumberTemplateEntity extends NumberTemplateEntityOptions {}
