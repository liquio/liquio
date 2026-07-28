import * as crypto from 'crypto';
import LogProvider from './providers/log_provider';
import AppInfo from '../app_info';
import { getTraceId, getTraceMeta } from '../async_local_storage';

// Constants.
const ERROR_MESSAGE_WRONG_PROVIDER = 'Wrong provider.';
const LOG_SAVING_ERROR_PROPERTY_PROVIDER_NAME = 'provider-name';
const ERROR_MESSAGE_LOG_SAVING_ERROR = `Log saving error at provider "${LOG_SAVING_ERROR_PROPERTY_PROVIDER_NAME}".`;
const INFO_LEVEL = 'info';
const WARNING_LEVEL = 'warning';
const ERROR_LEVEL = 'error';

/**
 * Log manager with provider pattern (singleton)
 */
class Log {
  private static singleton: Log;
  private providers: LogProvider[];
  private appInfo: AppInfo;

  /**
   * Log constructor
   * @param logProviders - Array of log providers
   * @param activeProviders - Array of active provider names to use
   */
  constructor(logProviders: LogProvider[] = [], activeProviders: string[] = []) {
    if (!Log.singleton) {
      if (!logProviders.every((v) => v instanceof LogProvider)) {
        throw new Error(ERROR_MESSAGE_WRONG_PROVIDER);
      }
      this.providers = logProviders.filter((provider) => activeProviders.includes(provider.name));
      this.appInfo = new AppInfo();
      Log.singleton = this;
    }
    return Log.singleton;
  }

  /**
   * Log levels
   */
  get Levels() {
    return {
      INFO_LEVEL,
      WARNING_LEVEL,
      ERROR_LEVEL,
    };
  }

  /**
   * Add log provider
   * @param logProvider - Log provider to add
   */
  addProvider(logProvider: LogProvider): void {
    if (!(logProvider instanceof LogProvider)) {
      throw new Error(ERROR_MESSAGE_WRONG_PROVIDER);
    }
    this.providers.push(logProvider);
  }

  /**
   * Save log entry
   * @param type - Log type
   * @param data - Log data (optional, default true)
   * @param level - Log level (optional, default 'info')
   * @returns Promise with unique log ID
   */
  async save(type: string, data: any = true, level: string = this.Levels.INFO_LEVEL): Promise<string | null> {
    if (process.env.DISABLE_LOG) return null;

    const timestamp = Date.now();
    const logId = crypto.randomBytes(6).toString('hex');
    const appInfoAll = this.appInfo.all;
    const traceId = getTraceId();
    const traceMeta = getTraceMeta();

    // Start async save without waiting
    (async () => {
      this.providers.forEach((logProvider) => {
        try {
          logProvider.save(timestamp, type, data, logId, appInfoAll as Record<string, any>, level, traceId, traceMeta);
        } catch {
          console.error(ERROR_MESSAGE_LOG_SAVING_ERROR.replace(LOG_SAVING_ERROR_PROPERTY_PROVIDER_NAME, logProvider?.name || 'unknown'));
        }
      });
    })();

    return logId;
  }

  /**
   * Router logging middleware
   * @param req - Express request
   * @param res - Express response
   * @param next - Next middleware
   */
  async logRouter(req: any, res: any, next: () => void): Promise<void> {
    const method = req?.method;
    const url = req?.url;
    const handlingInfo = res.handlingInfo;
    const remoteAddress = req.connection.remoteAddress;
    const xForwardedFor = req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;
    const requestId = crypto.randomBytes(16).toString('hex');
    const traceId = getTraceId();
    const traceMeta = getTraceMeta();

    const requestMeta = {
      method,
      url,
      userAgent,
      userIp: { remoteAddress, xForwardedFor },
      requestId,
      uriPattern: `${method}:${url}`,
    };

    req.requestMeta = { ...requestMeta };
    res.responseMeta = { ...requestMeta };

    this.save('http-request', { handlingInfo, ...requestMeta });

    if (typeof res.handlingInfo === 'object' && res.handlingInfo !== null) {
      res.handlingInfo.requestMeta = { ...requestMeta, method, url };
    }

    req.traceId = traceId;
    req.traceMeta = traceMeta;

    this.attachResponseLogger(req, res);

    next();
  }

  /**
   * Attach logger to response handling
   * @param req - Express request
   * @param res - Express response
   */
  private attachResponseLogger(req: any, res: any): void {
    const time = Date.now();

    const originalSend = res.send;
    const originalEnd = res.end;
    const originalJson = res.json;
    let responseLogged = false;

    const logResponse = (body: any) => {
      if (!responseLogged) {
        const data = {
          requestId: req.requestMeta?.requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseSize: body ? (typeof body === 'string' ? body.length : JSON.stringify(body).length) : 0,
          responseTime: Date.now() - time,
        };
        if (body instanceof Error) {
          (data as any).error = {
            message: body.message,
            stack: body.stack,
          };
        }
        this.save('http-response', data, this.Levels.INFO_LEVEL);
        responseLogged = true;
      }
    };

    res.send = function (body: any) {
      logResponse(body);
      return originalSend.call(this, body);
    };

    res.end = function (body: any) {
      logResponse(body);
      return originalEnd.call(this, body);
    };

    res.json = function (body: any) {
      logResponse(body);
      return originalJson.call(this, body);
    };
  }
}

export default Log;
