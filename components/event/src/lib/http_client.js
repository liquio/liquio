const stream = require('node:stream');
const axios = require('axios');
const Helpers = require('./helpers');
const MAX_LOG_LENGTH = 100e3 - 1000;

const DEFAULT_REQUEST_TIMEOUT = 60000; // 1 minute.

class HttpClient {
  /**
   * @param {{requestTimeout: number}} [config] Config object
   * @param {function} [logger] Log function
   * @param {function} [getTraceId] Async local storage getTraceId function. For setting global-trace-id header
   */
  constructor(config, logger, getTraceId) {
    /**
     * @private
     */
    this.config = config;
    /**
     * @private
     */
    this.logger = logger || console.log.bind(console);
    /**
     * @private
     */
    this.getTraceId = getTraceId;
  }

  /**
   * @param {string} url Url.
   * @param {object} init Data to request: method, headers, body, timeout etc.
   * @param {string} meta Meta data about request for logging.
   * @return {Promise<import('axios').AxiosResponse['data']>} Response data.
   */
  async request(url, init = {}, meta) {
    if (this.getTraceId) {
      init = { ...init, headers: { ...init.headers, 'global-trace-id': this.getTraceId() } };
    }

    const requestTimeout = init.timeout || this.config?.requestTimeout || DEFAULT_REQUEST_TIMEOUT;

    if (requestTimeout < 1000) {
      throw new Error('HttpClient.request timeout is too small. Minimum allowed is 1000 ms.');
    }

    this.logger('http-client-request', {
      meta,
      url,
      init: {
        ...init,
        agent: init.agent ? '****' : undefined,
        body: init.body instanceof stream.Readable ? 'stream.Readable' : Helpers.cutLongStrings(init.body, MAX_LOG_LENGTH),
        timeout: requestTimeout,
      },
    });

    const requestOptions = {
      url,
      method: init.method || 'GET',
      headers: init.headers || {},
      timeout: requestTimeout,
      data: init.body,
      responseType: init.responseType || 'json',
    };

    let response;
    try {
      response = await axios(requestOptions);
    } catch (error) {
      const preparedError = Helpers.prepareAxiosErrorToLog(error);
      if (preparedError?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        error.originalCode = preparedError?.code || null;
        error.code = 'ETIMEDOUT';
      }

      this.logger(
        'http-client-request-error',
        {
          ...preparedError,
          code: error.code,
          originalCode: error.originalCode,
          stack: error.stack,
          meta,
          requestOptions,
        },
        'error',
      );

      throw new Error('Server sent an HTTP request and got an network error.', { cause: error });
    }

    this.logger('http-client-response', { meta, response: `${response.status} ${response.statusText}` });

    // Return a result similar to node-fetch for backward compatibility.
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.data,
      json: async () => response.data,
      text: async () => (typeof response.data === 'string' ? response.data : JSON.stringify(response.data)), // Convert non-string data to JSON string for compatibility
    };
  }
}

module.exports = HttpClient;
