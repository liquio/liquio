// Constants.
const ERROR_MESSAGE_SAVE_METHOD_NOT_DEFINED = 'Save method not defined in current log provider.';
const ERROR_MESSAGE_CAN_NOT_SAVE_DATA = 'Can\'t save data.';

/**
 * Log provider.
 */
export class LogProvider {
  name: string;

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
  async save(timestamp: any, type: any, data: any, _logId?: any, _appInfo?: any, _level?: any, _traceId?: any, _traceMeta?: any): Promise<void> {
    // Throw error that method not re-defined in child class.
    console.log(`${ERROR_MESSAGE_CAN_NOT_SAVE_DATA}\n${data}`);
    throw new Error(ERROR_MESSAGE_SAVE_METHOD_NOT_DEFINED);
  }
}
