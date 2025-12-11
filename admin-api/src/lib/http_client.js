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
   * @param {boolean} [options.isDoNotCheckHTTPErrorCode]
   * @return {Promise<import('node-fetch').Response>}
   */
  async request(url, init = {}, meta, options = {}) {
    log.save('http-client-request-options', { meta, url, init });

    const { protocol, host } = new URL(url);
    const urlWithoutQueryParameters = `${protocol}//${host}`;

    const abortController = new AbortController();
    const timeout = setTimeout(
      () => {
        abortController.abort();
      },
      init.timeout || this.config?.requestTimeout || DEFAULT_REQUEST_TIMEOUT,
    );

    init = { ...init, signal: abortController.signal };

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
        ...error,
      });

      throw new HTTPRequestError('Server sent an HTTP request and got an network error.', {
        cause: {
          meta: meta,
          request: urlWithoutQueryParameters,
          errorCode: error.code,
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok && !options.isDoNotCheckHTTPErrorCode) {
      log.save('http-client-response-error', {
        meta,
        response: `${response.status} ${response.statusText}`,
        responseBody: await response.text(),
      });

      throw new HTTPResponseError('Server sent an HTTP request and got an error in response.', {
        cause: {
          meta: meta,
          request: urlWithoutQueryParameters,
          response: `${response.status} ${response.statusText}`,
        },
      });
    }

    log.save('http-client-request-success', { meta });

    response.body.on('error', (error) => {
      log.save('http-client-read-response-body-stream-error', { meta, error: error.toString() });
    });

    return response;
  }
}

module.exports = HttpClient;
