// Import.
import { getLog } from '../lib/context';

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
   */
  responseData(res, data = EMPTY_DATA, httpStatusCode = HTTP_STATUS_CODE_OK) {
    // Define response object.
    const responseObject = { data };

    // Log.
    getLog().save('http-response', responseObject);

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
    const message = error instanceof Error ? error.message : error;

    // Define response object.
    const responseObject = {
      error: typeof message === 'string' ? { message } : message,
    };

    // Log.
    getLog().save('http-response', responseObject);

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }
}

// Export.
export default Controller;
