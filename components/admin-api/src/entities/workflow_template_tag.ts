import { Entity } from './entity';

interface WorkflowTemplateTagEntityOptions {
  /** ID. */
  id: number;
  /** Name. */
  name: string;
  /** Color. */
  color: string;
  /** Description. */
  description: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
  /** Created by. */
  createdBy: string;
  /** Updated by. */
  updatedBy: string;
}

/**
 * Workflow template tag entity.
 */
export class WorkflowTemplateTagEntity extends Entity<WorkflowTemplateTagEntityOptions> {
  getFilterProperties(): (keyof WorkflowTemplateTagEntityOptions)[] {
    return ['id', 'name', 'color', 'description', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'];
  }

  getFilterPropertiesBrief(): (keyof WorkflowTemplateTagEntityOptions)[] {
    return this.getFilterProperties();
  }
}

export interface WorkflowTemplateTagEntity extends WorkflowTemplateTagEntityOptions {}
