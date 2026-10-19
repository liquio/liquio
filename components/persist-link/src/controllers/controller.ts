// Import.
import { getLog } from '../lib/context';
import { publicError } from '../lib/public_error';

// Constants.
const HTTP_STATUS_CODE_OK = 200;
const HTTP_STATUS_CODE_SERVER_ERROR = 500;
const EMPTY_DATA = {};
const CONTENT_TYPE_HEADER = 'Content-Type';
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
    // Save params.
    this.config = config;
  }

  /**
   * Response data.
   * @param {object} res HTTP response.
   * @param {object} [data] Data to response.
   * @param {number} [httpStatusCode] HTTP status code.
   * @param {object} [options] Options.
   * @param {boolean} [options.skipLog] Do not log the response data (e.g. it carries a link hash).
   */
  responseData(res, data = EMPTY_DATA, httpStatusCode = HTTP_STATUS_CODE_OK, { skipLog = false } = {}) {
    // Define response object.
    const responseObject = { data };

    // Log.
    getLog().save('http-response', skipLog ? { data: '[REDACTED]' } : responseObject);

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }

  /**
   * Response file.
   * @param {object} res HTTP response.
   * @param {Buffer} file File content as buffer.
   * @param {string} contentType Content-type.
   */
  responseFile(res, file, contentType) {
    // Response.
    res.set(CONTENT_TYPE_HEADER, contentType);
    res.send(file);
  }

  /**
   * Response error.
   * @param {object} res HTTP response.
   * @param {string|Error} [error] Error instance or message.
   * @param {number} [httpStatusCode] HTTP status code.
   */
  responseError(res, error = DEFAULT_ERROR_MESSAGE, httpStatusCode = HTTP_STATUS_CODE_SERVER_ERROR) {
    // Define params.
    // Only the text of public errors reaches the client; strings are written by the caller.
    const isError = error instanceof Error;
    const message = isError ? publicError(error, httpStatusCode) : error;

    // Define response object.
    const responseObject = {
      error: typeof message === 'string' ? { message } : message,
    };

    // Log.
    getLog().save('http-response', responseObject);
    if (isError && message !== error.message) {
      getLog().save('response-error-hidden', { message: error.message, stack: error.stack, httpStatusCode });
    }

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }
}

// Export.
export default Controller;
