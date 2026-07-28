/**
 * Log provider abstract base class.
 */
class LogProvider {
  /**
   * Log provider constructor.
   * @param {string} name Provider name.
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * Save log entry (must be implemented by subclass).
   */
  async save(_timestamp, _type, _data, _logId, _appInfo, _level, _traceId, _traceMeta) {
    throw new Error('Save method must be implemented by log provider subclass.');
  }
}

export default LogProvider;
