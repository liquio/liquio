// Import.
import axios from 'axios';
import bodyParser from 'body-parser';

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
   * @return {Promise<object>}
   */
  static async send(requestOptions) {
    const { body, ...axiosOptions } = requestOptions;
    // Any HTTP status is a result (not an error), only network errors and timeouts reject.
    const response = await axios({
      ...axiosOptions,
      data: body,
      responseType: 'text',
      transformResponse: (data) => data,
      validateStatus: () => true,
    });

    // Return responsed body object.
    return parseBody(response.data);
  }

  /**
   * Send HTTP request and get the response as a readable stream.
   * Body is not decoded: upstream status code and headers are available on the returned stream.
   * @param {object} requestOptions Request options.
   * @param {string} requestOptions.url URL.
   * @param {string} [requestOptions.method] Method.
   * @param {object} [requestOptions.headers] Headers in format {"key": "value"}.
   * @param {number} [requestOptions.timeout] Connection timeout.
   * @return {Promise<import('http').IncomingMessage>} Response stream.
   */
  static async stream(requestOptions) {
    const response = await axios({
      ...requestOptions,
      headers: { 'Accept-Encoding': 'identity', ...requestOptions.headers },
      responseType: 'stream',
      decompress: false,
      validateStatus: () => true,
    });
    return response.data;
  }

  /**
   * Upload readable stream and get response body.
   * @param {object} requestOptions Request options.
   * @param {ReadableStream} readableStream Stream to upload.
   * @return {Promise<object>} Parsed response body.
   */
  static async upload(requestOptions, readableStream) {
    const response = await axios({
      ...requestOptions,
      data: readableStream,
      maxBodyLength: Infinity,
      maxRedirects: 0,
      responseType: 'text',
      transformResponse: (data) => data,
      validateStatus: () => true,
    });
    return response.data;
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
