import { getTraceId } from '@liquio/back-core';

// Constants.
const HTTP_STATUS_CODE_OK = 200;
const HTTP_STATUS_CODE_SERVER_ERROR = 500;
const EMPTY_DATA = {};
const EMPTY_TEXT = '';
const DEFAULT_ERROR_MESSAGE = 'Server error.';

/**
 * Controller.
 */
export class Controller {
  config: any;

  /**
   * Controller constructor.
   * @param {object} config Config object.
   */
  constructor(config: any) {
    this.config = config;
  }

  /**
   * Response data.
   * @param {object} res HTTP response.
   * @param {object} [data] Data to response.
   * @param {number} [httpStatusCode] HTTP status code.
   */
  responseData(res: any, data: any = EMPTY_DATA, httpStatusCode: number = HTTP_STATUS_CODE_OK) {
    // Define response object.
    const responseObject = { data };

    // Log.
    global.log.save('http-response', responseObject);

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }

  /**
   * Response text.
   * @param {object} res HTTP response.
   * @param {object} [text] Data to response.
   * @param {number} [httpStatusCode] HTTP status code.
   */
  responseText(res: any, text: any = EMPTY_TEXT, httpStatusCode: number = HTTP_STATUS_CODE_OK) {
    // Log.
    global.log.save('http-response', text);

    // Response.
    res.status(httpStatusCode).send(text);
  }

  /**
   * Response error.
   * @param {object} res HTTP response.
   * @param {string|Error} [error] Error instance or message.
   * @param {number} [httpStatusCode] HTTP status code.
   */
  responseError(res: any, error: any = DEFAULT_ERROR_MESSAGE, httpStatusCode: number = HTTP_STATUS_CODE_SERVER_ERROR) {
    // Define params.
    const message = error instanceof Error ? error.message : error;

    // Define response object.
    const responseObject = { error: { message }, traceId: getTraceId() };

    // Log.
    global.log.save('http-response', responseObject);

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }
}
