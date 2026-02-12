// Constants.
const ERROR_MESSAGE_SAVE_METHOD_NOT_DEFINED = 'Save method not defined in current log provider.';
const ERROR_MESSAGE_CAN_NOT_SAVE_DATA = "Can't save data.";

/**
 * Log provider abstract base class.
 */
export default abstract class LogProvider {
  /**
   * Provider name.
   */
  public name: string;

  /**
   * Log provider constructor.
   * @param name - Provider name
   */
  constructor(name: string) {
    this.name = name;
  }

  /**
   * Save log entry (must be implemented by subclass).
   */
  abstract save(
    timestamp: number,
    type: string,
    data: any,
    logId: string,
    appInfo: Record<string, any>,
    level: string,
    traceId?: string,
    traceMeta?: Record<string, any>
  ): Promise<void>;
}
