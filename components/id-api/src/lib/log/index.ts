import crypto from 'crypto';

import { getTraceId, getTraceMeta } from '../../middleware/async_local_storage';
import { NextFunction, Request, Response } from '../../types';
import { ConsoleLogProvider } from './providers/console';
import { Services } from '../../services';

// Constants.
const LOG_SAVING_ERROR_PROPERTY_PROVIDER_NAME = 'provider-name';
const ERROR_MESSAGE_LOG_SAVING_ERROR = `Log saving error at provider "${LOG_SAVING_ERROR_PROPERTY_PROVIDER_NAME}".`;

export function useRequestLogger(express: any) {
  const log = Log.get();
  express.use(log.logRouter.bind(log));
}

/**
 * Log.
 */
export class Log {
  private static singleton: Log;
  private readonly providers!: any[];

  /**
   * Log constructor.
   */
  constructor(config: any) {
    if (Log.singleton) {
      throw new Error('Log already initialized.');
    }

    // Init providers.
    this.providers = [
      new ConsoleLogProvider('console', {
        excludeParams: config?.excludeParams,
      }),
    ];

    // Define singleton.
    Log.singleton = this;
  }

  static get() {
    if (!Log.singleton) {
      throw new Error('Log not initialized.');
    }
    return Log.singleton;
  }

  /**
   * Save.
   * @param {string} type Log type.
   * @param {any} [data] Log data.
   * @param {'info'|'warn'|'error'} level level.
   */
  save(type: string, data: any = true, level: 'info' | 'warn' | 'error' = 'info'): string {
    const timestamp = Date.now();
    const logId = crypto.randomBytes(6).toString('hex');
    const appInfoAll = Services.isInitialized ? Services.service('appInfo').all : {};
    const traceId = getTraceId();
    const traceMeta = getTraceMeta();

    // Start async thread without waiting result.
    (async () => {
      // Save log using all providers.
      this.providers.forEach((v) => {
        try {
          v.save(timestamp, type, data, logId, appInfoAll, level, traceId, traceMeta);
        } catch {
          console.error(ERROR_MESSAGE_LOG_SAVING_ERROR.replace(LOG_SAVING_ERROR_PROPERTY_PROVIDER_NAME, v?.name));
        }
      });
    })();

    return logId;
  }

  /**
   * Log router.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @param {object} next Next handler.
   */
  async logRouter(req: Request, res: Response, next: NextFunction) {
    // Define params.
    const method = req?.method;
    const url = req?.url;
    const remoteAddress = req.socket.remoteAddress;
    const xForwardedFor = req.headers['x-forwarded-for'] ?? null;
    const userAgent = req.headers['user-agent'] ?? null;
    const referrer = req.headers['referer'] ?? null;

    // Generate request ID.
    const requestId = crypto.randomBytes(12).toString('hex');
    req.requestId = requestId;

    // Define user params.
    const requestMeta = {
      userAgent,
      userIp: { remoteAddress, xForwardedFor },
      referrer,
    };

    // Save.
    this.save('http-request', { requestId, method, url, ...requestMeta });

    // Append handling info.
    if (typeof res.handlingInfo === 'object' && res.handlingInfo !== null) {
      res.handlingInfo.requestMeta = { ...requestMeta, method, url };
    }

    this.attachResponseLogger(req, res);

    // Go next.
    next();
  }

  /**
   * Attach logger to response handling.
   * @private
   * @param {object} res Express response object.
   */
  attachResponseLogger(req: Request, res: Response) {
    const time = Date.now();

    const originalSend = res.send;
    const originalEnd = res.end;
    const originalJson = res.json;
    let responseLogged = false;

    const logResponse = (body: any) => {
      if (!responseLogged) {
        this.save('http-response', {
          requestId: req.requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseSize: body ? body.length : 0,
          responseTime: Date.now() - time,
        });
        responseLogged = true;
      }
    };

    (res as any).send = (body: any) => {
      logResponse(body);
      originalSend.call(res, body);
    };

    (res as any).end = (body: any) => {
      logResponse(body);
      originalEnd.call(res, body, 'utf8');
    };

    (res as any).json = (body: any) => {
      logResponse(body);
      originalJson.call(res, body);
    };
  }
}
