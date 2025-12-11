const { fetchToCurl } = require('fetch-to-curl');

const { getTraceId } = require('./async_local_storage');
const { HTTPRequestError, HTTPResponseError } = require('./errors');

// Fix import node-fetch for CommonJS modules. https://github.com/node-fetch/node-fetch/blob/HEAD/docs/v3-UPGRADE-GUIDE.md
const nodeFetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const getAbortError = () => import('node-fetch').then(({ AbortError }) => AbortError);

const DEFAULT_REQUEST_TIMEOUT = 60000; // 1 minute.


class HttpClient {

  constructor(config) {
    /**
     * @private
     */
    this.config = config;
  }

  /**
   * @param {import('node-fetch').RequestInfo} url
   * @param {import('node-fetch').RequestInit|{ timeout: number }} [init]
   * @param {string} [meta]
   * @param {Object} [options]
   * @param {boolean} [options.isDoNotCheckHTTPErrorCode = false] Is do not throw error when HTTP code != 200
   * @param {boolean} [options.isNonSensitiveDataRegime = false] Is throw errors with sensitive data (full URL, responseBody, etc.)
   * @return {Promise<import('node-fetch').Response>}
   */
  async request(url, init = {}, meta, options = {}) {
    log.save('http-client-request-options', { meta, url, init: { ...init, /*replace for log*/ agent: undefined } });

    let urlWithoutQueryParameters;
    try {
      const { protocol, host } = new URL(url);
      urlWithoutQueryParameters = options.isNonSensitiveDataRegime ? url : `${protocol}//${host}`;
    } catch  {
      throw new HTTPRequestError('Server is trying to sent an HTTP request with invalid URL.', {
        cause: {
          meta: meta,
          url: options.isNonSensitiveDataRegime ? url : undefined
        }
      });
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort();
    }, init.timeout || this.config?.requestTimeout || DEFAULT_REQUEST_TIMEOUT);

    init = {
      ...init,
      headers: {
        ...init.headers,
        'global-trace-id': getTraceId()
      },
      signal: abortController.signal
    };

    let response;
    try {
      response = await nodeFetch(url, init);
    } catch (error) {

      // Fix import node-fetch for CommonJS modules. https://github.com/node-fetch/node-fetch/blob/HEAD/docs/v3-UPGRADE-GUIDE.md
      const AbortError = await getAbortError();
      if (error instanceof AbortError) {
        error.code = 'ETIMEDOUT';
      }

      log.save('http-client-request-error', {
        meta,
        error: error.toString(),
        stack: error.stack,
        curl: this.makeCurl(url, init),
        ...error
      });

      throw new HTTPRequestError('Server sent an HTTP request and got an network error.', {
        cause: {
          meta: meta,
          request: `${init.method} ${options.isNonSensitiveDataRegime ? url : urlWithoutQueryParameters}`,
          errorCode: error.code,
        }
      });

    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok && !options.isDoNotCheckHTTPErrorCode) {
      const responseBody = await response.text();
      log.save('http-client-response-error', {
        meta,
        curl: this.makeCurl(url, init),
        response: `${response.status} ${response.statusText}`,
        responseBody: responseBody
      });

      throw new HTTPResponseError('Server sent an HTTP request and got an error in response.', {
        cause: {
          meta: meta,
          request: `${init.method} ${options.isNonSensitiveDataRegime ? url : urlWithoutQueryParameters}`,
          response: `${response.status} ${response.statusText}`,
          responseBody: options.isNonSensitiveDataRegime ? responseBody : undefined
        }
      });
    }

    log.save('http-client-request-success', { meta });

    response.body.on('error', (error) => {
      log.save('http-client-read-response-body-stream-error', { meta, error: error.toString() });
    });

    return response;
  }

  /**
   * @private
   * @param {import('node-fetch').RequestInfo} url
   * @param {import('node-fetch').RequestInit} [init]
   * @return {string|undefined}
   */
  makeCurl(url, init) {
    let curl;
    try {
      curl = fetchToCurl(url, init);
    } catch (error) {
      log.save('http-client-request-make-curl-error', error.toString());
    }
    return curl;
  }
}

module.exports = HttpClient;
