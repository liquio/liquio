import axios, { AxiosError } from 'axios';
import * as bodyParser from 'body-parser';
import * as formData from 'express-form-data';
import * as xmlparser from 'express-xml-bodyparser';

import Helpers from '../helpers';

// Constants.
const DEFAULT_MAX_BODY_SIZE = '10mb';
const HTTP_METHOD_GET = 'GET';
const HTTP_METHOD_POST = 'POST';
const HTTP_METHOD_PUT = 'PUT';
const HTTP_METHOD_DELETE = 'DELETE';
const CONTENT_TYPE_JSON = 'application/json';
const CONTENT_TYPE_FORM_URL_ENCODED = 'application/x-www-form-urlencoded';
const ACCEPT_JSON = 'application/json';

interface RequestOptions {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  [key: string]: any;
}

interface HttpResponse {
  response: SerializableResponse;
  body: any;
}

interface SerializableResponse {
  status: number;
  statusText: string;
  headers: Record<string, any>;
  data: any;
  config: {
    url: string;
    method: string;
    headers: Record<string, string>;
    timeout?: number;
  };
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    data?: string;
    timeout?: number;
  };
}

/**
 * HTTP client wrapper with request/response handling and body parsers
 */
class HttpRequest {
  /**
   * HTTP methods
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
   * Content types
   */
  static get ContentTypes() {
    return {
      CONTENT_TYPE_JSON,
      CONTENT_TYPE_FORM_URL_ENCODED,
    };
  }

  /**
   * Accept headers
   */
  static get Accepts() {
    return {
      ACCEPT_JSON,
    };
  }

  /**
   * Send HTTP request
   * @param requestOptions - Request options (url, method, headers, body, timeout)
   * @param fullResponse - Whether to return full response object
   * @returns Promise with response body or full response
   */
  static async send(requestOptions: RequestOptions, fullResponse: boolean = false): Promise<any | HttpResponse> {
    const axiosOptions: any = {
      ...requestOptions,
      data: requestOptions.body,
    };
    delete axiosOptions.body;

    try {
      const response = await axios(axiosOptions);
      const bodyObject = parseBody(response.data);
      return fullResponse ? { response: createSerializableResponse(response), body: bodyObject } : bodyObject;
    } catch (error) {
      log?.save(
        'http-request-send-error',
        {
          requestOptions: axiosOptions,
          ...Helpers.prepareAxiosErrorToLog(error),
        },
        'error'
      );
      throw error;
    }
  }

  /**
   * Send HEAD request
   * @param requestOptions - Request options (url, method, headers, timeout)
   * @param headerName - Header name to retrieve
   * @returns Promise with header value
   */
  static async sendHeadRequest(requestOptions: RequestOptions, headerName: string = ''): Promise<string> {
    const axiosOptions: any = {
      ...requestOptions,
      method: 'HEAD',
      data: requestOptions.body,
    };
    delete axiosOptions.body;

    try {
      const response = await axios(axiosOptions);
      return response.headers[headerName.toLowerCase()];
    } catch (error) {
      log?.save(
        'http-request-send-head-request-error',
        {
          requestOptions: axiosOptions,
          ...Helpers.prepareAxiosErrorToLog(error),
        },
        'error'
      );
      throw error;
    }
  }

  /**
   * Get JSON body parser
   * @param maxBodySize - Max body size (default 10mb)
   * @returns Body parser middleware
   */
  static getJsonBodyParser(maxBodySize: string = DEFAULT_MAX_BODY_SIZE) {
    return bodyParser.json({ limit: maxBodySize });
  }

  /**
   * Get URL-encoded body parser
   * @returns Body parser middleware
   */
  static getUrlencodedBodyParser() {
    return bodyParser.urlencoded({ extended: false });
  }

  /**
   * Get form data body parser
   * @returns Body parser middleware
   */
  static getFormDataBodyParser() {
    return formData.parse();
  }

  /**
   * Get XML body parser
   * @returns Body parser middleware
   */
  static getXmlBodyParser() {
    return xmlparser({ normalizeTags: false });
  }

  /**
   * Add JSON body parser to Express app
   * @param app - Express app instance
   * @param maxBodySize - Max body size (default 10mb)
   */
  static parseBodyJson(app: any, maxBodySize: string = DEFAULT_MAX_BODY_SIZE): void {
    app.use(bodyParser.json({ limit: maxBodySize }));
  }

  /**
   * Add URL-encoded body parser to Express app
   * @param app - Express app instance
   */
  static parseBodyUrlencoded(app: any): void {
    app.use(bodyParser.urlencoded({ extended: false }));
  }
}

/**
 * Create serializable response object to avoid circular references
 */
function createSerializableResponse(axiosResponse: any): SerializableResponse {
  return {
    status: axiosResponse.status,
    statusText: axiosResponse.statusText,
    headers: axiosResponse.headers,
    data: axiosResponse.data,
    config: {
      url: axiosResponse.config.url,
      method: axiosResponse.config.method,
      headers: axiosResponse.config.headers,
      timeout: axiosResponse.config.timeout,
    },
    request: {
      method: axiosResponse.config.method,
      url: axiosResponse.config.url,
      headers: axiosResponse.config.headers,
      data: axiosResponse.config.data,
      timeout: axiosResponse.config.timeout,
    },
  };
}

/**
 * Parse response body (try JSON, fallback to string)
 */
function parseBody(body: any): any {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export default HttpRequest;
