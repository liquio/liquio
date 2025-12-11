const { getTraceId } = require('../lib/async_local_storage');

const HTTP_STATUS_CODE_OK = 200;
const HTTP_STATUS_CODE_SERVER_ERROR = 500;
const EMPTY_DATA = {};
const DEFAULT_ERROR_MESSAGE = 'Server error.';

/**
 * Controller.
 */
class Controller {
  /**
   * Controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Response data.
   * @param {object} res HTTP response.
   * @param {object} [data] Data to response.
   * @param {number} [httpStatusCode] HTTP status code.
   */
  responseData(res, data = EMPTY_DATA, httpStatusCode = HTTP_STATUS_CODE_OK) {
    // Define response object.
    const responseObject = { data };

    // Log.
    log.save('http-response', responseObject);

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }

  /**
   * Response error.
   * @param {object} res HTTP response.
   * @param {string|Error} [error] Error instance or message.
   * @param {number} [httpStatusCode] HTTP status code.
   */
  responseError(res, error = DEFAULT_ERROR_MESSAGE, httpStatusCode = HTTP_STATUS_CODE_SERVER_ERROR) {
    // Define params.
    const message = error instanceof Error ? error.message : error;

    // Define response object.
    const responseObject = { error: { message }, traceId: getTraceId() };

    // Log.
    log.save('http-response', responseObject);

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }
}

module.exports = Controller;
