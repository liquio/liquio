import { Response } from 'node-fetch';

import { getLog } from './context';
import { HTTPRequestError, HTTPResponseError } from './errors';

// Fix import node-fetch for CommonJS modules. https://github.com/node-fetch/node-fetch/blob/HEAD/docs/v3-UPGRADE-GUIDE.md
const nodeFetch = (...args: [string | URL, any?]) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const getAbortError = () => import('node-fetch').then(({ AbortError }) => AbortError);

const DEFAULT_REQUEST_TIMEOUT = 60000; // 1 minute.

/**
 * Strip query string (may carry identifiers/tokens) from URL for logs.
 * @param {string|URL} url URL.
 * @returns {string} URL without query.
 */
function urlWithoutQuery(url: string | URL): string {
  try {
    const { protocol, host, pathname } = new URL(url);
    return `${protocol}//${host}${pathname}`;
  } catch {
    return '[invalid-url]';
  }
}

export class HttpClient {
  public config: any;

  constructor(config: unknown) {
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
  async request(url: string | URL, init = {}, meta: any, options: any = {}) {
    getLog().save('http-client-request-options', { meta, url: urlWithoutQuery(url), method: (init as any)?.method });

    const { protocol, host } = new URL(url);
    const urlWithoutQueryParameters = `${protocol}//${host}`;

    const abortController = new AbortController();
    const timeout = setTimeout(
      () => {
        abortController.abort();
      },
      (init as any).timeout || this.config?.requestTimeout || DEFAULT_REQUEST_TIMEOUT,
    );

    init = { ...init, signal: abortController.signal };

    let response: Response;
    try {
      response = await nodeFetch(url, init);
    } catch (error) {
      // Fix import node-fetch for CommonJS modules. https://github.com/node-fetch/node-fetch/blob/HEAD/docs/v3-UPGRADE-GUIDE.md
      const AbortError = await getAbortError();
      if (error instanceof AbortError) {
        (error as any).code = 'ETIMEDOUT';
      }

      getLog().save('http-client-request-error', {
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
      getLog().save('http-client-response-error', {
        meta,
        response: `${response.status} ${response.statusText}`,
        responseBodyLength: (await response.text()).length,
      });

      throw new HTTPResponseError('Server sent an HTTP request and got an error in response.', {
        cause: {
          meta: meta,
          request: urlWithoutQueryParameters,
          response: `${response.status} ${response.statusText}`,
        },
      });
    }

    getLog().save('http-client-request-success', { meta });

    response.body.on('error', (error: { toString: () => any }) => {
      getLog().save('http-client-read-response-body-stream-error', { meta, error: error.toString() });
    });

    return response;
  }
}
