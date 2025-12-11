const axios = require('axios');
const bodyParser = require('body-parser');

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
   * @param {boolean} [withFullResponse] Whether to return full response or only body.
   * @returns {Promise<object>}
   */
  static async send(requestOptions, withFullResponse = false) {
    try {
      const axiosConfig = {
        url: requestOptions.url,
        method: requestOptions.method,
        headers: requestOptions.headers,
        timeout: requestOptions.timeout,
        validateStatus: () => true, // Don't throw on any status code
      };

      // Add data for POST, PUT requests
      if (requestOptions.body) {
        // Parse JSON body if it's a string, to match nock expectations
        try {
          const parsed = JSON.parse(requestOptions.body);
          axiosConfig.data = parsed;
          // Ensure proper Content-Type header for JSON
          if (!axiosConfig.headers) {
            axiosConfig.headers = {};
          }
          if (!axiosConfig.headers['Content-Type'] && !axiosConfig.headers['content-type']) {
            axiosConfig.headers['Content-Type'] = 'application/json';
          }
        } catch {
          // If not JSON, send as string
          axiosConfig.data = requestOptions.body;
        }
      }

      const response = await axios.create()(axiosConfig);

      // Return parsed body object - only the data part to avoid circular refs
      const body = parseBody(response.data);
      if (withFullResponse) {
        return { response: createSerializableResponse(response), body };
      }
      return body;
    } catch (error) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status - only return the data part
        const body = parseBody(error.response.data);
        if (withFullResponse) {
          return { response: createSerializableResponse(error.response), body };
        }
        return body;
      }
      // Network or other errors - throw a clean error message
      throw new Error(error.message || 'Network error');
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
 * Create serializable response object to avoid circular references.
 * @private
 * @param {object} axiosResponse Axios response object.
 * @returns {object}
 */
function createSerializableResponse(axiosResponse) {
  return {
    status: axiosResponse.status,
    statusText: axiosResponse.statusText,
    headers: axiosResponse.headers,
    data: axiosResponse.data,
    config: {
      url: axiosResponse.config.url,
      method: axiosResponse.config.method,
      headers: axiosResponse.config.headers,
      timeout: axiosResponse.config.timeout
    },
    request: {
      method: axiosResponse.config.method,
      url: axiosResponse.config.url,
      headers: axiosResponse.config.headers,
      data: axiosResponse.config.data,
      timeout: axiosResponse.config.timeout
    }
  };
}

/**
 * Parse body.
 * @private
 * @param {string|object} body Body.
 * @returns {object}
 */
function parseBody(body) {
  // If body is already an object (axios parsed it), return as is
  if (typeof body === 'object') {
    return body;
  }
  
  // If body is string, try to parse as JSON
  if (typeof body === 'string') {
    try {
      const bodyObject = JSON.parse(body);
      return bodyObject;
    } catch {
      return body;
    }
  }
  
  // Return body as is for other types
  return body;
}

module.exports = HttpRequest;
