// Constants.
const ERROR_MESSAGE_SAVE_METHOD_NOT_DEFINED = 'Save method not defined in current log provider.';
const ERROR_MESSAGE_CAN_NOT_SAVE_DATA = "Can't save data.";
const LEVELS = {
  info: 'info',
  warn: 'warn',
  error: 'error',
};

/**
 * Log provider.
 */
export default class LogProvider {
  public name: string;

  /**
   * Log provider constructor.
   * @param {string} name Provider name.
   */
  constructor(name: string) {
    this.name = name;
  }

  /**
   * Levels.
   * @returns {LEVELS} Log levels.
   */
  static get Levels() {
    return LEVELS;
  }

  /**
   * Save.
   * @param {Date} timestamp Timestamp.
   * @param {string} type Log type.
   * @param {string} data Log data.
   * @param {string} logId Log ID.
   * @param {string} level Log level. Enum: `info`, `warn`, `error`.
   */
  async save(timestamp: Date, type: string, data: string, logId: string, appInfo: object, level: string, _traceId?: string, _traceMeta?: object) {
    // Throw error that method not re-defined in child class.
    process.stdout.write(`${ERROR_MESSAGE_CAN_NOT_SAVE_DATA}\n${level} | ${type} | ${timestamp} | ${logId}\n${data}`);
    throw new Error(ERROR_MESSAGE_SAVE_METHOD_NOT_DEFINED);
  }
}
