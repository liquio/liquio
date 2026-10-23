import { Entity } from '../entity';
import { WorkflowLoggerRecordEntity } from './workflow_logger_record';

interface WorkflowLoggerEntityOptions {
  /** Worflow ID. */
  workflowId: string;
  /** Workflow logger record entities list. */
  logs: WorkflowLoggerRecordEntity[];
}

/**
 * Workflow logger entity.
 * @typedef {import('./workflow_logger_record')} WorkflowLoggerRecordEntity
 */
export class WorkflowLoggerEntity extends Entity<WorkflowLoggerEntityOptions> {
  /**
   * Add log.
   * @param {WorkflowLoggerRecordEntity} log Workflow logger record entity.
   */
  addLog(log: WorkflowLoggerRecordEntity) {
    // Add new log record to logs list.
    this.logs.push(log);
  }

  /**
   * Sort logs.
   */
  sortLogs() {
    // Sort logs by creating timestamp.
    this.logs = this.logs.sort((a, b) => {
      return +new Date(a.createdAt) - +new Date(b.createdAt);
    });
  }
}

export interface WorkflowLoggerEntity extends WorkflowLoggerEntityOptions {}
