import { Entity } from './entity';

interface WorkflowErrorEntityOptions {
  /** ID. */
  id: number;
  /** Workflow ID. */
  workflowId: string;
  /** Service name. */
  serviceName: string;
  /** Data. */
  data: string;
  /** Type. */
  type: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Workflow error entity.
 */
export class WorkflowErrorEntity extends Entity<WorkflowErrorEntityOptions> {

  getFilterProperties(): (keyof WorkflowErrorEntityOptions)[] {
    return ['id', 'serviceName', 'data', 'createdAt', 'updatedAt'];
  }

  getFilterPropertiesBrief(): (keyof WorkflowErrorEntityOptions)[] {
    return this.getFilterProperties();
  }
}

export interface WorkflowErrorEntity extends WorkflowErrorEntityOptions { }
