import { Entity } from './entity';

interface WorkflowDebugEntityOptions {
  /** ID. */
  id: string;
  /** Workflow ID. */
  workflowId: string;
  /** Service name. */
  serviceName: string;
  /** Data. */
  data: object;
  /** Type. */
  type: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Workflow debug entity.
 */
export class WorkflowDebugEntity extends Entity<WorkflowDebugEntityOptions> {}

export interface WorkflowDebugEntity extends WorkflowDebugEntityOptions {}
