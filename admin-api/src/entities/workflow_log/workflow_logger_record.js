/**
 * Workflow logger record entity.
 */
class WorkflowLoggerRecordEntity {
  /**
   * Workflow logger record entity constructor.
   * @param {object} data Data.
   * @param {string} type Workflow logger record type.
   * @param {object[]} warnings Warning messages.
   * @param {object} details Details.
   * @param {Date} createdAt Created at.
   * @param {Date} [updatedAt] Updated at.
   */
  constructor({ type, warnings = [], details, createdAt, updatedAt }) {
    this.type = type;
    this.warnings = warnings;
    this.details = details;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = WorkflowLoggerRecordEntity;
