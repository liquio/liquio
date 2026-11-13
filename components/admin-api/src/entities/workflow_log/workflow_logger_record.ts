import { Entity } from '../entity';

interface WorkflowLoggerRecordEntityOptions {
  /** Workflow logger record type. */
  type: string;
  /** Warning messages. */
  warnings?: object[];
  /** Details. */
  details: any;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt?: Date;
}

/**
 * Workflow logger record entity.
 */
export class WorkflowLoggerRecordEntity extends Entity<WorkflowLoggerRecordEntityOptions> {}

export interface WorkflowLoggerRecordEntity extends WorkflowLoggerRecordEntityOptions {}
