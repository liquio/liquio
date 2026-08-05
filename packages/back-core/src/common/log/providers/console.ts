import { LogProvider } from './log_provider';
import { sensitiveReplace } from '../helpers/sensitiveReplace';
import { cutLongStrings } from '../helpers/cutLongStrings';

// Constants.
const DEFAULT_PROVIDER_NAME = 'console';
const WARNING_LEVEL = 'warning';
const ERROR_LEVEL = 'error';
const MAX_LOG_LENGTH = 100e3;
const LENGTH_ERROR_SUBSTRING_LENGTH = 10e3;

/**
 * Console log provider.
 */
export class ConsoleLogProvider extends LogProvider {
  public options: any;

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
  async save(
    timestamp: Date | string | number,
    type: string,
    data: unknown,
    logId: string,
    appInfo: unknown,
    level: string,
    traceId?: string,
    traceMeta?: unknown,
  ): Promise<void> {
    // Define params.
    const now = new Date(timestamp);
    const createdAt = now.toISOString();
    const cutData = cutLongStrings(data as string | Record<string, unknown>, MAX_LOG_LENGTH - 5000);
    const dataObjectToSave = { type: `${type}`, data: cutData, createdAt, logId, appInfo, level, traceId, traceMeta };
    let dataStringToSave;
    try {
      dataStringToSave = sensitiveReplace(JSON.stringify(dataObjectToSave), this.options.excludeParams);
    } catch {
      dataStringToSave = `${dataObjectToSave}`;
    }

    // Guard against oversized log lines.
    if (dataStringToSave.length > MAX_LOG_LENGTH) {
      level = ERROR_LEVEL;
      dataStringToSave = JSON.stringify({
        type: 'log-too-long-error',
        length: dataStringToSave.length,
        data: dataStringToSave.substring(0, LENGTH_ERROR_SUBSTRING_LENGTH),
        createdAt: new Date().toISOString(),
      });
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
}
