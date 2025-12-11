const LogProvider = require('./log_provider');
const Helpers = require('../../helpers');
const sensitiveReplace = require('../helpers/sensitiveReplace');

// Constants.
const DEFAULT_PROVIDER_NAME = 'console';
const WARNING_LEVEL = 'warning';
const ERROR_LEVEL = 'error';
const MAX_LOG_LENGTH = 100e3;
const LENGTH_ERROR_SUBSTRING_LENGTH = 10e3;

/**
 * Console log provider.
 */
class ConsoleLogProvider extends LogProvider {
  /**
   * Console log provider constructor.
   * @param {string} [name] Log provider name.
   * @param {object} [options] Log additional options
   */
  constructor(name = DEFAULT_PROVIDER_NAME, options = {}) {
    super(name);
    this.options = options;
  }

  /**
   * Save.
   * @param {Date} timestamp Timestamp.
   * @param {string} type Log type.
   * @param {string} data Log data.
   * @param {string} logId Log ID.
   * @param {object} appInfo App info.
   * @param {string} level Level.
   * @param {string} [traceId] Trace ID.
   * @param {object} [traceMeta] Trace meta.
   */
  async save(timestamp, type, data, logId, appInfo, level, traceId, traceMeta) {
    // Define params.
    const now = new Date(timestamp);
    const createdAt = now.toISOString();
    const cuttedLogData = Helpers.cutLongStrings(data, MAX_LOG_LENGTH - 5000);
    const dataObjectToSave = { type: `${type}`, data: cuttedLogData, createdAt, logId, appInfo, level, traceId, traceMeta };
    let dataStringToSave;
    try {
      dataStringToSave = sensitiveReplace(JSON.stringify(dataObjectToSave), this.options.excludeParams);
    } catch {
      dataStringToSave = `${dataObjectToSave}`;
    }

    // Check log.
    const { isCorrect, message } = this.checkLog(dataStringToSave);
    if (!isCorrect) {
      console.error(message);
      return;
    }

    // Show in console.
    switch (level) {
      case WARNING_LEVEL:
        process.stderr.write(dataStringToSave + '\n');
        break;
      case ERROR_LEVEL:
        process.stderr.write(dataStringToSave + '\n');
        break;
      default:
        process.stdout.write(dataStringToSave + '\n');
    }
  }

  /**
   * Check log.
   * @param {string} str String.
   * @return {{isCorrect, message}} Check result.
   */
  checkLog(str) {
    // Check length.
    if (str?.length > MAX_LOG_LENGTH) {
      const now = new Date();
      const createdAt = now.toISOString();
      return {
        isCorrect: false,
        message: JSON.stringify(
          {
            type: 'log-too-long-error',
            length: str.length,
            data: str.substring(0, LENGTH_ERROR_SUBSTRING_LENGTH),
            createdAt,
          },
          null,
          4,
        ),
      };
    }

    // Return that everything is ok.
    return { isCorrect: true, message: '' };
  }
}

module.exports = ConsoleLogProvider;
