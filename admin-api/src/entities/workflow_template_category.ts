import { Entity } from './entity';

interface WorkflowTemplateCategoryEntityOptions {
  /** ID. */
  id: number;
  /** Parent ID. */
  parentId: number | null;
  /** Name. */
  name: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Workflow template category entity.
 */
export class WorkflowTemplateCategoryEntity extends Entity<WorkflowTemplateCategoryEntityOptions> {

  getFilterProperties(): (keyof WorkflowTemplateCategoryEntityOptions)[] {
    return ['id', 'parentId', 'name', 'createdAt', 'updatedAt'];
  }

  getFilterPropertiesBrief(): (keyof WorkflowTemplateCategoryEntityOptions)[] {
    return this.getFilterProperties();
  }
}

export interface WorkflowTemplateCategoryEntity extends WorkflowTemplateCategoryEntityOptions { }
