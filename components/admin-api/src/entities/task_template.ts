import { Entity } from './entity';

interface TaskTemplateEntityOptions {
  /** ID. */
  id: number;
  /** Name. */
  name: string;
  /** Document template ID. */
  documentTemplateId: number;
  /** Json schema. */
  jsonSchema: object;
  /** Json schema raw. */
  jsonSchemaRaw: string;
  /** Html template. */
  htmlTemplate: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Task template entity.
 */
export class TaskTemplateEntity extends Entity<TaskTemplateEntityOptions> {
  getFilterProperties(): (keyof TaskTemplateEntityOptions)[] {
    return ['id', 'name', 'documentTemplateId', 'jsonSchema', 'htmlTemplate'];
  }

  getFilterPropertiesBrief(): (keyof TaskTemplateEntityOptions)[] {
    return this.getFilterProperties();
  }
}

export interface TaskTemplateEntity extends TaskTemplateEntityOptions {}
