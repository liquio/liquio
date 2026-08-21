// Constants.
const ERROR_MESSAGE_SAVE_METHOD_NOT_DEFINED = 'Save method not defined in current log provider.';
const ERROR_MESSAGE_CAN_NOT_SAVE_DATA = "Can't save data.";

/**
 * Log provider.
 */
export class LogProvider {
  public name: string;

  /**
   * Log provider constructor.
   * @param {string} name Provider name.
   */
  constructor(name: string) {
    this.name = name;
  }

  /**
   * Save.
   */
  async save(
    _timestamp: Date | string | number,
    _type: string,
    data: unknown,
    _logId: string,
    _appInfo: unknown,
    _level: string,
    _traceId?: string,
    _traceMeta?: unknown,
  ): Promise<void> {
    // Throw error that method not re-defined in child class.
    console.log(`${ERROR_MESSAGE_CAN_NOT_SAVE_DATA}\n${data}`);
    throw new Error(ERROR_MESSAGE_SAVE_METHOD_NOT_DEFINED);
  }
}
