/**
 * Workflow logger entity.
 * @typedef {import('./workflow_logger_record')} WorkflowLoggerRecordEntity
 */
class WorkflowLoggerEntity {
  /**
   * Workflow logger entity constructor.
   * @param {string} workflowId Worflow ID.
   * @param {WorkflowLoggerRecordEntity[]} logs Workflow logger record entities list.
   */
  constructor(workflowId, logs = []) {
    this.workflowId = workflowId;
    this.logs = logs;
  }

  /**
   * Add log.
   * @param {WorkflowLoggerRecordEntity} log Workflow logger record entity.
   */
  addLog(log) {
    // Add new log record to logs list.
    this.logs.push(log);
  }

  /**
   * Sort logs.
   */
  sortLogs() {
    // Sort logs by creating timestamp.
    this.logs = this.logs.sort((a, b) => { return +new Date(a.createdAt) - +new Date(b.createdAt); });
  }
}

module.exports = WorkflowLoggerEntity;
