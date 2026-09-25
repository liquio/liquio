// Import.
import request from 'request';

// Constants.
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
   * @return {Promise<object>}
   */
  static async send(requestOptions) {
    return new Promise((resolve, reject) => {
      // Do request.
      request(requestOptions, (err, res, body) => {
        // Check error.
        if (err) {
          return reject(err);
        }

        // Return responsed body object.
        const bodyObject = parseBody(body);
        resolve(bodyObject);
      });
    });
  }
}

/**
 * Parse body.
 * @private
 * @param {string} body Body.
 * @return {object}
 */
function parseBody(body) {
  try {
    const bodyObject = JSON.parse(body);
    return bodyObject;
  } catch {
    return body;
  }
}

// Export.
export default HttpRequest;
