import { Entity } from './entity';

interface WorkflowHistoryEntityOptions {
  /** ID. */
  id: string;
  /** Workflow template ID. */
  workflowTemplateId: string;
  /** User ID. */
  userId: string;
  /** Data. */
  data: object;
  /** Version. */
  version: string;
  /** Current version. */
  isCurrentVersion: boolean;
  /** Meta. */
  meta: object;
  /** Name. */
  name: string;
  /** Description. */
  description: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Workflow history entity.
 */
export class WorkflowHistoryEntity extends Entity<WorkflowHistoryEntityOptions> {
}

export interface WorkflowHistoryEntity extends WorkflowHistoryEntityOptions { }
