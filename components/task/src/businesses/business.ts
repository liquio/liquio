
import { appendTraceMeta, getTraceMeta, getTraceId } from '../lib/async_local_storage';

/**
 * Business.
 */
export class Business {
  config: any;

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
  getTraceMeta(): any {
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

