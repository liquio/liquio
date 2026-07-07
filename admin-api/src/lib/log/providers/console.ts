import { LogProvider } from './log_provider';
import { sensitiveReplace } from '../helpers/sensitiveReplace';

// Constants.
const DEFAULT_PROVIDER_NAME = 'console';
const WARNING_LEVEL = 'warning';
const ERROR_LEVEL = 'error';

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
    const dataObjectToSave = { type: `${type}`, data, createdAt, logId, appInfo, level, traceId, traceMeta };
    let dataStringToSave;
    try {
      dataStringToSave = sensitiveReplace(JSON.stringify(dataObjectToSave), this.options.excludeParams);
    } catch {
      dataStringToSave = `${dataObjectToSave}`;
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

