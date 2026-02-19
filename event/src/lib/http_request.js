const axios = require('axios');
const bodyParser = require('body-parser');

const { prepareAxiosErrorToLog } = require('./helpers');

// Constants.
const DEFAULT_MAX_BODY_SIZE = '10mb';
const HTTP_METHOD_GET = 'GET';
const HTTP_METHOD_POST = 'POST';
const HTTP_METHOD_PUT = 'PUT';
const HTTP_METHOD_DELETE = 'DELETE';
const CONTENT_TYPE_JSON = 'application/json';
const CONTENT_TYPE_FORM_URL_ENCODED = 'application/x-www-form-urlencoded';
const ACCEPT_JSON = 'application/json';

/**
 * Request.
 */
class HttpRequest {
  /**
   * Methods.
   */
  static get Methods() {
    return {
      GET: HTTP_METHOD_GET,
      POST: HTTP_METHOD_POST,
      PUT: HTTP_METHOD_PUT,
      DELETE: HTTP_METHOD_DELETE,
    };
  }

  /**
   * Content-Types.
   */
  static get ContentTypes() {
    return {
      CONTENT_TYPE_JSON,
      CONTENT_TYPE_FORM_URL_ENCODED,
    };
  }

  /**
   * Accepts.
   */
  static get Accepts() {
    return {
      ACCEPT_JSON,
    };
  }

  /**
   * Send HTTP request.
   * @param {object} requestOptions Request options.
   * @param {string} requestOptions.url URL.
   * @param {string} requestOptions.method Method.
   * @param {object} [requestOptions.headers] Headers in format {"key": "value"}.
   * @param {string} [requestOptions.body] Body string.
   * @param {number} [requestOptions.timeout] Connection timeout.
   * @param {boolean} fullResponse Full response indicator.
   * @returns {Promise<object>}
   */
  static async send(requestOptions, fullResponse = false) {
    // Expect requestOptions as for request lib and transform it for axios for backward compatibility.
    try {
      const { body, ...rest } = requestOptions;
      const axiosOptions = {
        ...rest,
        data: typeof body === 'object' || body === null ? body : parseBody(body),
      };
      const response = await axios(axiosOptions);
      const responseData = response.data;
      // Return a result similar to request lib for backward compatibility.
      return fullResponse
        ? { fullResponse: { statusCode: response.status, headers: response.headers, body: responseData }, body: responseData }
        : responseData;
    } catch (error) {
      log.save('http-request-error', prepareAxiosErrorToLog(error), 'error');
      if (error.response?.data) {
        const strError = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
        throw new Error(strError, { cause: error });
      } else {
        throw error;
      }
    }
  }

  /**
   * Parse body JSON.
   * @param {object} app Express app instance.
   * @param {string} [maxBodySize] Max body size.
   */
  static parseBodyJson(app, maxBodySize = DEFAULT_MAX_BODY_SIZE) {
    // Parse body for content-type "application/json".
    app.use(bodyParser.json({ limit: maxBodySize }));
  }

  /**
   * Parse body urlencoded.
   * @param {object} app Express app instance.
   */
  static parseBodyUrlencoded(app) {
    // Parse body for content-type "application/x-www-form-urlencoded".
    app.use(bodyParser.urlencoded({ extended: false }));
  }
}

/**
 * Parse body.
 * @private
 * @param {string} body Body.
 * @returns {object}
 */
function parseBody(body) {
  try {
    const bodyObject = JSON.parse(body);
    return bodyObject;
  } catch {
    return body;
  }
}

module.exports = HttpRequest;
