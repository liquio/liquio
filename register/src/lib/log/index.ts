import crypto from 'crypto';

import LogProvider, { LogLevels } from './providers/log_provider';
import { getTraceId, getTraceMeta } from '../async_local_storage';
import AppInfo from '../app_info';
import { Request, Response } from '../../router';

// Constants.
const ERROR_MESSAGE_WRONG_PROVIDER = 'Wrong provider.';
const LOG_SAVING_ERROR_PROPERTY_PROVIDER_NAME = 'provider-name';
const ERROR_MESSAGE_LOG_SAVING_ERROR = `Log saving error at provider "${LOG_SAVING_ERROR_PROPERTY_PROVIDER_NAME}".`;
const INFO_LEVEL = 'info';
const WARNING_LEVEL = 'warning';
const ERROR_LEVEL = 'error';

/**
 * Log.
 */
export default class Log {
  private static singleton: Log;

  public providers: LogProvider[];
  public appInfo: AppInfo;

  /**
   * Log constructor.
   */
  constructor(logProviders: LogProvider[] = []) {
    // Define singleton.
    if (!Log.singleton) {
      if (!logProviders.every((v) => v instanceof LogProvider)) {
        throw new Error(ERROR_MESSAGE_WRONG_PROVIDER);
      }
      this.providers = logProviders;
      Log.singleton = this;

      // Attach app info AFTER singleton is defined.
      this.appInfo = new AppInfo();
    }
    return Log.singleton;
  }

  /**
   * Get Log instance.
   */
  static getInstance(): Log {
    if (!Log.singleton) {
      throw new Error('Log singleton is not initialized.');
    }
    return Log.singleton;
  }

  /**
   * Log levels.
   */
  get Levels(): { [key: string]: LogLevels } {
    return {
      INFO_LEVEL,
      WARNING_LEVEL,
      ERROR_LEVEL
    };
  }

  /**
   * Add provider.
   */
  addProvider(logProvider: LogProvider): void {
    if (!(logProvider instanceof LogProvider)) {
      throw new Error(ERROR_MESSAGE_WRONG_PROVIDER);
    }
    this.providers.push(logProvider);
  }

  /**
   * Save log entry.
   */
  async save(type: string, data: any = true, level: LogLevels = this.Levels.INFO_LEVEL): Promise<string> {
    if (process.env.DISABLE_LOG) return null;
    // Define params.
    const timestamp = Date.now();
    const logId = crypto.randomBytes(6).toString('hex');
    const traceId = getTraceId();
    const traceMeta = getTraceMeta();
    const appInfoAll = this.appInfo?.all;

    // Start async thread without waiting result.
    (async () => {
      // Save log using all providers.
      this.providers.forEach((logProvider) => {
        try {
          logProvider.save(timestamp, type, data, logId, appInfoAll, level, traceId, traceMeta);
        } catch {
          console.error(ERROR_MESSAGE_LOG_SAVING_ERROR.replace(LOG_SAVING_ERROR_PROPERTY_PROVIDER_NAME, logProvider && logProvider.name));
        }
      });
    })();

    // Return generated log ID.
    return logId;
  }

  /**
   * Log router.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @param {object} next Next handler.
   */
  async logRouter(req: Request, res: Response, next: Function): Promise<void> {
    // Define params.
    const method = req && req.method;
    const url = req && req.url;
    const handlingInfo = res.handlingInfo;
    const remoteAddress = req.connection.remoteAddress;
    const xForwardedFor = req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;
    const traceId = getTraceId();
    const traceMeta = getTraceMeta();

    // Define user params.
    const requestMeta = {
      userAgent,
      userIp: { remoteAddress, xForwardedFor }
    };

    // Save.
    this.save('http-request', { method, url, handlingInfo, ...requestMeta });

    // Append handling info.
    if (typeof res.handlingInfo === 'object' && res.handlingInfo !== null) {
      res.handlingInfo.requestMeta = { ...requestMeta, method, url };
    }

    // Append trace params.
    req.traceId = traceId;
    req.traceMeta = traceMeta;

    this.attachResponseLogger(req, res);

    // Go next.
    next();
  }

  /**
   * Attach logger to response handling.
   * @private
   * @param {object} req Express request object.
   * @param {object} res Express response object.
   */
  attachResponseLogger(req, res) {
    const time = Date.now();

    const originalSend = res.send;
    const originalEnd = res.end;
    const originalJson = res.json;
    let responseLogged = false;

    const logResponse = (body) => {
      if (!responseLogged) {
        const data = {
          requestId: req.requestMeta?.requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseSize: body ? body.length : 0,
          responseTime: Date.now() - time
        };
        if (body instanceof Error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data as any).error = {
            message: body.message,
            stack: body.stack
          };
        }
        this.save('http-response', data, this.Levels.INFO_LEVEL);
        responseLogged = true;
      }
    };

    res.send = (body) => {
      logResponse(body);
      originalSend.call(res, body);
    };

    res.end = (body) => {
      logResponse(body);
      originalEnd.call(res, body);
    };

    res.json = (body) => {
      logResponse(body);
      originalJson.call(res, body);
    };
  }
}
