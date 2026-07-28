// Constants.
const ERROR_MESSAGE_SAVE_METHOD_NOT_DEFINED = 'Save method not defined in current log provider.';
const ERROR_MESSAGE_CAN_NOT_SAVE_DATA = "Can't save data.";

export type LogLevels = 'info' | 'warning' | 'error';

/**
 * Log provider.
 */
export default abstract class LogProvider {
  public name: string;

  /**
   * Log provider constructor.
   */
  constructor(name: string) {
    this.name = name;
  }

  /**
   * Save.
   */
  async save(
    timestamp: number,
    type: string,
    data: any,
    _logId: string,
    _appInfo: any,
    _level: LogLevels,
    _traceId: string,
    _traceMeta: any
  ): Promise<void> {
    // Throw error that method not re-defined in child class.
    console.log(`${ERROR_MESSAGE_CAN_NOT_SAVE_DATA}\n${data}`);
    throw new Error(ERROR_MESSAGE_SAVE_METHOD_NOT_DEFINED);
  }
}
