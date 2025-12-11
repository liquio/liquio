const axios = require('axios');
const bodyParser = require('body-parser');
const formData = require('express-form-data');
const xmlparser = require('express-xml-bodyparser');

const { prepareAxiosErrorToLog } = require('../helpers');

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
   * @param {boolean} [fullResponse] Response {response, body}.
   * @returns {Promise<object>}
   */
  static async send(requestOptions, fullResponse = false) {
    // Expect requestOptions as for request lib and transform it for axios for backward compatibility.
    const axiosOptions = {
      ...requestOptions,
      data: requestOptions.body,
    };
    delete axiosOptions.body;

    try {
      const response = await axios(axiosOptions);
      const bodyObject = parseBody(response.data);
      return fullResponse ? { response: createSerializableResponse(response), body: bodyObject } : bodyObject;
    } catch (error) {
      // Log and rethrow error
      global.log?.save(
        'http-request-send-error',
        {
          requestOptions: axiosOptions,
          ...prepareAxiosErrorToLog(error),
        },
        'error',
      );
      throw error;
    }
  }

  /**
   * Send head request.
   * @param {object} requestOptions Request options.
   * @param {string} requestOptions.url URL.
   * @param {string} requestOptions.method Method.
   * @param {object} [requestOptions.headers] Headers in format {"key": "value"}.
   * @param {number} [requestOptions.timeout] Connection timeout.
   * @param {string} headerName Header name.
   * @returns {Promise<string>}
   */
  static async sendHeadRequest(requestOptions, headerName = '') {
    // Expect requestOptions as for request lib and transform it for axios for backward compatibility.
    const axiosOptions = {
      ...requestOptions,
      method: 'HEAD',
      data: requestOptions.body,
    };
    delete axiosOptions.body;

    try {
      const response = await axios(axiosOptions);
      return response.headers[headerName.toLowerCase()];
    } catch (error) {
      global.log?.save(
        'http-request-send-head-request-error',
        {
          requestOptions: axiosOptions,
          ...prepareAxiosErrorToLog(error),
        },
        'error',
      );
      throw error;
    }
  }

  /**
   * Get JSON body parser.
   * @param {string} [maxBodySize] Max body size.
   */
  static getJsonBodyParser(maxBodySize = DEFAULT_MAX_BODY_SIZE) {
    // Return body parser for content-type "application/json".
    return bodyParser.json({ limit: maxBodySize });
  }

  /**
   * Get urlencoded body parser.
   */
  static getUrlencodedBodyParser() {
    // Return body parser for content-type "application/x-www-form-urlencoded".
    return bodyParser.urlencoded({ extended: false });
  }

  /**
   * Get form data body parser.
   */
  static getFormDataBodyParser() {
    // Return body parser for content-type "multipart/form-data".
    return formData.parse();
  }

  /**
   * Get xml body parser.
   */
  static getXmlBodyParser() {
    return xmlparser({ normalizeTags: false });
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
 * @param {string} body Body.
 * @returns {object}
 */
function parseBody(body) {
  try {
    const bodyObject = JSON.parse(body);
    return bodyObject;
  } catch (err) {
    return body;
  }
}

module.exports = HttpRequest;
