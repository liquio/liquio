
const axios = require('axios');
const rawBody = require('raw-body');
const bodyParser = require('body-parser');
const formData = require('express-form-data');
const multer = require('multer');
const xmlparser = require('express-xml-bodyparser');

const { getTraceId } = require('./async_local_storage');

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
      DELETE: HTTP_METHOD_DELETE
    };
  }

  /**
   * Content-Types.
   */
  static get ContentTypes() {
    return {
      CONTENT_TYPE_JSON,
      CONTENT_TYPE_FORM_URL_ENCODED
    };
  }

  /**
   * Accepts.
   */
  static get Accepts() {
    return {
      ACCEPT_JSON
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
    requestOptions.headers = requestOptions.headers || {};
    requestOptions.headers['x-trace-id'] = getTraceId();

    // Configure axios request
    const axiosConfig = {
      url: requestOptions.url,
      method: requestOptions.method,
      headers: requestOptions.headers,
      timeout: requestOptions.timeout,
      validateStatus: () => true // Don't reject on HTTP error status codes
    };

    // Handle body data - send as string if it's a string, otherwise as data
    if (requestOptions.body) {
      if (typeof requestOptions.body === 'string') {
        // For string bodies, we need to set the data and potentially adjust content-type
        axiosConfig.data = requestOptions.body;
        
        // If it looks like JSON and no content-type is set, preserve the raw string behavior
        if (!axiosConfig.headers['content-type'] && !axiosConfig.headers['Content-Type']) {
          try {
            JSON.parse(requestOptions.body);
            // It's valid JSON but no content-type set, let axios handle it
          } catch {
            // Not JSON, treat as raw data
            axiosConfig.headers['content-type'] = 'application/x-www-form-urlencoded';
          }
        }
      } else {
        axiosConfig.data = requestOptions.body;
      }
    }

    // Handle streaming responses
    if (requestOptions.responseType === 'stream') {
      axiosConfig.responseType = 'stream';
    }

    // Configure axios with fresh agents for test environment
    if (process.env.NODE_ENV === 'test') {
      const http = require('http');
      const https = require('https');
      
      // Create fresh agents for each request in test environment
      axiosConfig.httpAgent = new http.Agent({
        keepAlive: false,
        timeout: axiosConfig.timeout || 10000
      });
      
      axiosConfig.httpsAgent = new https.Agent({
        keepAlive: false,
        timeout: axiosConfig.timeout || 10000
      });
    }

    // Do request.
    const response = await axios(axiosConfig);
    
    // Clean up agents in test environment
    if (process.env.NODE_ENV === 'test') {
      if (axiosConfig.httpAgent) {
        axiosConfig.httpAgent.destroy();
      }
      if (axiosConfig.httpsAgent) {
        axiosConfig.httpsAgent.destroy();
      }
    }

    // Create a response object that matches the request library format but without circular references
    const normalizedResponse = createSerializableResponse(response);

    // Handle streaming responses
    if (requestOptions.responseType === 'stream') {
      return fullResponse ? { response: normalizedResponse, data: response.data } : { data: response.data };
    }

    // Return responsed body object.
    const bodyObject = parseBody(response.data);
    return fullResponse ? { response: normalizedResponse, body: bodyObject } : bodyObject;
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
  static async sendHeadRequest(requestOptions, headerName) {
    // Configure axios request
    const axiosConfig = {
      url: requestOptions.url,
      method: requestOptions.method,
      headers: requestOptions.headers,
      timeout: requestOptions.timeout,
      validateStatus: () => true // Don't reject on HTTP error status codes
    };

    // Configure axios with fresh agents for test environment
    if (process.env.NODE_ENV === 'test') {
      const http = require('http');
      const https = require('https');
      
      // Create fresh agents for each request in test environment
      axiosConfig.httpAgent = new http.Agent({
        keepAlive: false,
        timeout: axiosConfig.timeout || 10000
      });
      
      axiosConfig.httpsAgent = new https.Agent({
        keepAlive: false,
        timeout: axiosConfig.timeout || 10000
      });
    }

    // Do request.
    const response = await axios(axiosConfig);
    
    // Clean up agents in test environment
    if (process.env.NODE_ENV === 'test') {
      if (axiosConfig.httpAgent) {
        axiosConfig.httpAgent.destroy();
      }
      if (axiosConfig.httpsAgent) {
        axiosConfig.httpsAgent.destroy();
      }
    }
    
    const responseInHeader = response.headers[headerName];

    // Return response in header.
    return responseInHeader;
  }

  /**
   * Get raw body.
   * @param {string} [maxBodySize] Max body size.
   * @return function
   */
  static getRawBody(maxBodySize = DEFAULT_MAX_BODY_SIZE) {
    return async (req, res, next) => {
      let buffer;
      try {
        buffer = await rawBody(req, { length: req.headers['content-length'], limit: maxBodySize });
      } catch (error) {
        next(error);
        return;
      }
      req.body = buffer.toString('utf-8');
      next();
    };
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
   * Get form data body parser and keep files in memory.
   */
  static getFormDataBodyParserInMemory() {
    // Return body parser for content-type "multipart/form-data".
    return (limits) => {
      const storage = multer.memoryStorage();
      return multer({ limits, storage }).any();
    };
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
    },
    // Add statusCode for backward compatibility with request library format
    statusCode: axiosResponse.status
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
  } catch {
    return body;
  }
}

module.exports = HttpRequest;
