import { Helpers } from '../../helpers';
import LogProvider from './log_provider';

// Constants.
const DEFAULT_PROVIDER_NAME = 'console';
const MAX_LOG_LENGTH = 100_000 - 1_000;
const LENGTH_ERROR_SUBSTRING_LENGTH = 1_000;
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
export class ConsoleLogProvider extends LogProvider {
  private readonly excludeParamsJson: string[];
  private readonly excludeParamsQuery: string[];
  private readonly replaceMask: string;

  /**
   * Console log provider constructor.
   */
  constructor(name: string = DEFAULT_PROVIDER_NAME, options = {} as any) {
    // Call parent constructor.
    super(name);
    const { excludeParams = DEFAULT_EXCLUDE_PARAMS, replaceMask = '****' } = options;
    this.excludeParamsJson = excludeParams?.filter((p: string) => !p.endsWith('='));
    this.excludeParamsQuery = excludeParams?.filter((p: string) => p.endsWith('='));
    this.replaceMask = replaceMask;
    process.stdout.write(JSON.stringify({ type: 'console-log-provider', data: { excludeParams } }) + '\n');
  }

  /**
   * Save.
   */
  async save(timestamp: Date, type: string, data: string, logId: string, appInfo: object, level: string, traceId?: string, traceMeta?: object) {
    // Define params.
    const now = new Date(timestamp);
    const createdAt = now.toISOString();
    const cuttedLogData = Helpers.cutLongStrings(data, MAX_LOG_LENGTH);
    const dataObjectToSave = {
      type: `${type}`,
      data: cuttedLogData,
      createdAt,
      logId,
      appInfo,
      level,
      traceId,
      traceMeta,
    };

    let dataStringToSave: any;
    try {
      dataStringToSave = this.sensitiveReplace(JSON.stringify(dataObjectToSave));
    } catch {
      dataStringToSave = JSON.stringify(dataObjectToSave);
    }

    // Check log.
    const { isCorrect, message } = this.checkLog(dataStringToSave);
    if (!isCorrect) {
      process.stderr.write(message + '\n');
      return;
    }

    // Show in console.
    switch (level) {
      case LogProvider.Levels.info:
        process.stdout.write(`${dataStringToSave}\n`);
        break;
      case LogProvider.Levels.warn:
        process.stderr.write(`${dataStringToSave}\n`);
        break;
      case LogProvider.Levels.error:
        process.stderr.write(`${dataStringToSave}\n`);
        break;
      default:
        process.stdout.write(`${dataStringToSave}\n`);
    }
  }

  /**
   * Check log.
   * @param {string} str String.
   * @return {{isCorrect, message}} Check result.
   */
  checkLog(str: string): { isCorrect: boolean; message: string } {
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
   * @param {Object} sensitiveString String with sensitive data.
   * @return {string} "Clear" string - without sensitive data.
   */
  sensitiveReplace(sensitiveString: object | string): object | string {
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
