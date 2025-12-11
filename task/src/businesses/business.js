
const { appendTraceMeta, getTraceMeta, getTraceId } = require('../lib/async_local_storage');

/**
 * Business.
 */
class Business {
  /**
   * Business constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Append trace meta.
   * @param {object} meta Meta object to append.
   */
  appendTraceMeta(meta) {
    appendTraceMeta(meta);
  }

  /**
   * Get trace meta.
   * @returns {{workflowId, taskId, documentId}} Trace meta object.
   */
  getTraceMeta() {
    return getTraceMeta() || {};
  }

  /**
   * Get trace ID.
   * @returns {string} Trace ID.
   */
  getTraceId() {
    return getTraceId() || null;
  }
}

module.exports = Business;
