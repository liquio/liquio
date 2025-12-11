const crypto = require('crypto');

const LogProvider = require('./providers/log_provider');
const AppInfo = require('../app_info');
const { getTraceId, getTraceMeta } = require('../async_local_storage');

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
class Log {
  /**
   * Log constructor.
   * @param {LogProvider[]} [logProviders] Log providers.
   * @param {string[]} [activeProviders] Active providers.
   */
  constructor(logProviders = [], activeProviders = []) {
    // Define singleton.
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
   * Log levels.
   */
  get Levels() {
    return {
      INFO_LEVEL,
      WARNING_LEVEL,
      ERROR_LEVEL,
    };
  }

  /**
   * Add provider.
   * @param {LogProvider} logProvider Log provider.
   */
  addProvider(logProvider) {
    if (!(logProvider instanceof LogProvider)) {
      throw new Error(ERROR_MESSAGE_WRONG_PROVIDER);
    }
    this.providers.push(logProvider);
  }

  /**
   * Save.
   * @param {string} type Log type.
   * @param {any} [data] Log data.
   * @param {string} [level] Log level.
   * @returns {Promise<string>} Log ID promise.
   */
  async save(type, data = true, level = this.Levels.INFO_LEVEL) {
    if (process.env.DISABLE_LOG) return null;
    // Define params.
    const timestamp = Date.now();
    const logId = crypto.randomBytes(6).toString('hex');
    const appInfoAll = this.appInfo.all;
    const traceId = getTraceId();
    const traceMeta = getTraceMeta();

    // Start async thread without waiting result.
    (async () => {
      // Save log using all providers.
      this.providers.forEach((logProvider) => {
        try {
          logProvider.save(timestamp, type, data, logId, appInfoAll, level, traceId, traceMeta);
        } catch (err) {
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
  async logRouter(req, res, next) {
    // Define params.
    const method = req && req.method;
    const url = req && req.url;
    const handlingInfo = res.handlingInfo;
    const remoteAddress = req.connection.remoteAddress;
    const xForwardedFor = req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;
    const requestId = crypto.randomBytes(16).toString('hex');
    const traceId = getTraceId();
    const traceMeta = getTraceMeta();

    // Define user params.
    const requestMeta = {
      method,
      url,
      userAgent,
      userIp: { remoteAddress, xForwardedFor },
      requestId,
      uriPattern: `${method}:${url}`,
    };

    // Define response meta.
    req.requestMeta = { ...requestMeta };
    res.responseMeta = { ...requestMeta };

    // Save.
    this.save('http-request', { handlingInfo, ...requestMeta });

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
          responseTime: Date.now() - time,
        };
        if (body instanceof Error) {
          data.error = {
            message: body.message,
            stack: body.stack,
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

module.exports = Log;
