import { Entity } from './entity';

interface WorkflowStatusEntityOptions {
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
 * Workflow status entity.
 */
export class WorkflowStatusEntity extends Entity<WorkflowStatusEntityOptions> {

  getFilterProperties(): (keyof WorkflowStatusEntityOptions)[] {
    return ['id', 'name', 'createdAt', 'updatedAt'];
  }

  getFilterPropertiesBrief(): (keyof WorkflowStatusEntityOptions)[] {
    return this.getFilterProperties();
  }
}

export interface WorkflowStatusEntity extends WorkflowStatusEntityOptions { }
