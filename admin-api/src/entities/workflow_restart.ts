import { Entity } from './entity';

interface WorkflowRestartEntityOptions {
  /** ID. */
  id: number;
  /** Workflow ID. */
  workflowId: string;
  /** Workflow error ID. */
  workflowErrorId: number;
  /** Type. */
  type: string;
  /** Data. */
  data: object;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Workflow restart entity.
 */
export class WorkflowRestartEntity extends Entity<WorkflowRestartEntityOptions> {
}

export interface WorkflowRestartEntity extends WorkflowRestartEntityOptions { }
