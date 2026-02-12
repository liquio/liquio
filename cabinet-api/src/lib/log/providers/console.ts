import LogProvider from './log_provider';
import Helpers from '../../helpers';
import sensitiveReplace from '../helpers/sensitiveReplace';

// Constants.
const DEFAULT_PROVIDER_NAME = 'console';
const WARNING_LEVEL = 'warning';
const ERROR_LEVEL = 'error';
const MAX_LOG_LENGTH = 100e3;
const LENGTH_ERROR_SUBSTRING_LENGTH = 10e3;

interface LogCheckResult {
  isCorrect: boolean;
  message: string;
}

/**
 * Console log provider
 */
class ConsoleLogProvider extends LogProvider {
  private options: Record<string, any>;

  /**
   * Console log provider constructor
   * @param name - Provider name (default 'console')
   * @param options - Additional options (excludeParams, etc.)
   */
  constructor(name: string = DEFAULT_PROVIDER_NAME, options: Record<string, any> = {}) {
    super(name);
    this.options = options;
  }

  /**
   * Save log entry to console
   * @param timestamp - Timestamp in milliseconds
   * @param type - Log type
   * @param data - Log data (string or any)
   * @param logId - Unique log ID
   * @param appInfo - Application info object
   * @param level - Log level (info, warning, error)
   * @param traceId - Optional trace ID
   * @param traceMeta - Optional trace metadata
   */
  async save(
    timestamp: number,
    type: string,
    data: any,
    logId: string,
    appInfo: Record<string, any>,
    level: string,
    traceId?: string,
    traceMeta?: Record<string, any>,
  ): Promise<void> {
    const now = new Date(timestamp);
    const createdAt = now.toISOString();
    const cuttedLogData = Helpers.cutLongStrings(data, (MAX_LOG_LENGTH as number) - 5000);
    const dataObjectToSave = { type, data: cuttedLogData, createdAt, logId, appInfo, level, traceId, traceMeta };

    let dataStringToSave: string;
    try {
      dataStringToSave = sensitiveReplace(JSON.stringify(dataObjectToSave), this.options.excludeParams) as string;
    } catch {
      dataStringToSave = `${dataObjectToSave}`;
    }

    const { isCorrect, message } = this.checkLog(dataStringToSave);
    if (!isCorrect) {
      console.error(message);
      return;
    }

    // Show in console based on level
    switch (level) {
      case WARNING_LEVEL:
      case ERROR_LEVEL:
        process.stderr.write(dataStringToSave + '\n');
        break;
      default:
        process.stdout.write(dataStringToSave + '\n');
    }
  }

  /**
   * Check if log is valid
   * @param str - Log string to validate
   * @returns Check result with isCorrect flag and message
   */
  private checkLog(str: string): LogCheckResult {
    if (str?.length > (MAX_LOG_LENGTH as number)) {
      const now = new Date();
      const createdAt = now.toISOString();
      return {
        isCorrect: false,
        message: JSON.stringify(
          {
            type: 'log-too-long-error',
            length: str.length,
            data: str.substring(0, LENGTH_ERROR_SUBSTRING_LENGTH as number),
            createdAt,
          },
          null,
          4,
        ),
      };
    }

    return { isCorrect: true, message: '' };
  }
}

export default ConsoleLogProvider;
