// Import.
import LibHttpRequest from '../../../http_request';

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
    return LibHttpRequest.send(requestOptions);
  }

  /**
   * Send HTTP request and get the response as a readable stream.
   * @param {object} requestOptions Request options.
   * @return {Promise<import('http').IncomingMessage>} Response stream with upstream status code and headers.
   */
  static async stream(requestOptions) {
    return LibHttpRequest.stream(requestOptions);
  }

  /**
   * Upload readable stream and get response body.
   * @param {object} requestOptions Request options.
   * @param {ReadableStream} readableStream Stream to upload.
   * @return {Promise<string>} Response body.
   */
  static async upload(requestOptions, readableStream) {
    return LibHttpRequest.upload(requestOptions, readableStream);
  }
}

// Export.
export default HttpRequest;
