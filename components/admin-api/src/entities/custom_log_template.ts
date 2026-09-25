import { Entity } from './entity';

interface CustomLogTemplateEntityOptions {
  /** ID. */
  id: number;
  /** Name. */
  name: string;
  documentTemplateId: string;
  /** Operation type. */
  operationType:
    | 'read-document'
    | 'create-document'
    | 'update-document'
    | 'delete-document'
    | 'add-attach'
    | 'remove-attach'
    | 'generate-pdf'
    | 'sign'
    | 'commit';
  /** Schema. */
  schema: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Custom log template entity.
 */
export class CustomLogTemplateEntity extends Entity<CustomLogTemplateEntityOptions> {}

export interface CustomLogTemplateEntity extends CustomLogTemplateEntityOptions {}
