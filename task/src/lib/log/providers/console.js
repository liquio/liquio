const LogProvider = require('./log_provider');
const Helpers = require('../../helpers');

// Constants.
const DEFAULT_PROVIDER_NAME = 'console';
const WARNING_LEVEL = 'warning';
const ERROR_LEVEL = 'error';
const MAX_LOG_LENGTH = 100e3;
const LENGTH_ERROR_SUBSTRING_LENGTH = 10e3;
const DEFAULT_EXCLUDE_PARAMS = [
  'token',
  'access_token',
  'refresh_token',
  'oauth-token',
  'authorization',
  'Authorization',
  'secret',
  'password',
  'oldPassword',
  'oldPasswords',
  'client_secret',
  // params with '=' at the end mean that they are parameters in the query string.
  '_token=',
  'client_id=',
  'client_secret=',
];

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
    const { excludeParams = DEFAULT_EXCLUDE_PARAMS, replaceMask = '****' } = options;
    this.excludeParamsJson = excludeParams?.filter((p) => !p.endsWith('='));
    this.excludeParamsQuery = excludeParams?.filter((p) => p.endsWith('='));
    this.replaceMask = replaceMask;
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
    const cuttedLogData = this.options.isFullLogsEnabled ? data : Helpers.cutLongStrings(data, MAX_LOG_LENGTH - 5000);
    const dataObjectToSave = { type: `${type}`, data: cuttedLogData, createdAt, logId, appInfo, level, traceId, traceMeta };
    let dataStringToSave;
    try {
      dataStringToSave = this.sensitiveReplace(JSON.stringify(dataObjectToSave));
    } catch {
      dataStringToSave = JSON.stringify(dataObjectToSave);
    }

    // Check log.
    const { isCorrect, message } = this.checkLog(dataStringToSave);
    if (!isCorrect && !this.options.isFullLogsEnabled) {
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
        message: JSON.stringify({
          type: 'log-too-long-error',
          length: str.length,
          data: str.substring(0, LENGTH_ERROR_SUBSTRING_LENGTH),
          createdAt,
        }),
      };
    }

    // Return that everything is ok.
    return { isCorrect: true, message: '' };
  }

  /**
   * @param {string} sensitiveString String with sensitive data.
   * @return {string} "Clear" string - without sensitive data.
   */
  sensitiveReplace(sensitiveString) {
    if (typeof sensitiveString !== 'string' || (this.excludeParamsJson.length === 0 && this.excludeParamsQuery.length === 0)) {
      return sensitiveString;
    }

    let resultString = sensitiveString;

    if (this.excludeParamsJson.length) {
      // Regex example: /"(token|oauth-token|authorization|Authorization|secret|password|oldPassword|oldPasswords)": ?"(.+?)"/gm
      const regexForJson = new RegExp(`"(${this.excludeParamsJson.join('|')})": ?"(.+?)"`, 'gm');
      const matchesInJson = [...resultString.matchAll(regexForJson)];
      if (matchesInJson.length) {
        matchesInJson.forEach(([stringToReplace, , value]) => {
          resultString = resultString.replace(stringToReplace, stringToReplace.replace(value, this.replaceMask));
        });
      }
    }
    if (this.excludeParamsQuery.length) {
      // Regex example: /(_token=)[^&"]*/gm
      const regexForQuery = new RegExp(`(${this.excludeParamsQuery.join('|')})[^&"]*`, 'gm');
      const matchesInQuery = [...resultString.matchAll(regexForQuery)];
      if (matchesInQuery.length) {
        matchesInQuery.forEach(([stringToReplace, value]) => {
          resultString = resultString.replace(stringToReplace, `${value}${this.replaceMask}`);
        });
      }
    }

    return resultString;
  }
}

module.exports = ConsoleLogProvider;
