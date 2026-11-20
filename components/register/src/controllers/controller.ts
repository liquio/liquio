import { getTraceId, Log } from '@liquio/back-core';

import Sign from '../lib/sign';
import { isPublicError, publicError } from '../lib/public_error';
import { Response } from '../router';

// Constants.
const HTTP_STATUS_CODE_OK = 200;
const HTTP_STATUS_CODE_SERVER_ERROR = 500;
const EMPTY_DATA = null;
const CONTENT_TYPE_HEADER = 'Content-Type';
const DEFAULT_ERROR_MESSAGE = 'Server error.';

/**
 * Controller.
 */
export default class Controller {
  protected log = Log.getInstance();

  public name: string;
  public config: any;
  public sign: Sign;

  /**
   * Controller constructor.
   * @param {object} config Config object.
   */
  constructor(config: any) {
    this.config = config;
    this.sign = new Sign(config.sign);
  }

  /**
   * Response data.
   * @param {object} res HTTP response.
   * @param {object} [data] Data to response.
   * @param {object} [meta] Meta info to response.
   * @param {number} [httpStatusCode] HTTP status code.
   */
  responseData(res: Response, data: any = EMPTY_DATA, meta?: any, httpStatusCode: number = HTTP_STATUS_CODE_OK) {
    // Define response object.
    const responseObject = { data, meta };

    // Log.
    this.log.save('http-response', this.config.log.responsesData ? responseObject : '***');

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }

  /**
   * Response file.
   * @param {object} res HTTP response.
   * @param {Buffer} file File content as buffer.
   * @param {string} contentType Content-type.
   */
  responseFile(res: Response, file: Buffer, contentType: string) {
    // Response.
    res.set(CONTENT_TYPE_HEADER, contentType);
    res.send(file);
  }

  /**
   * Response error.
   * @param {object} res HTTP response.
   * @param {string|Error} [error] Error instance or message.
   * @param {number} [httpStatusCode] HTTP status code.
   * @param {any} [details] Details.
   */
  responseError(res: Response, error: Error | string = DEFAULT_ERROR_MESSAGE, httpStatusCode: number = HTTP_STATUS_CODE_SERVER_ERROR, details?: any) {
    // Define params. Only the text of public errors reaches the client; strings are written by the caller.
    const isError = error instanceof Error;
    const message = isError ? publicError(error, httpStatusCode) : error;
    const code = isError && isPublicError(error) ? (error as any).code : null;

    // Define response object.
    const responseObject = {
      error: {
        message,
        details,
        code,
      },
      traceId: getTraceId(),
    };

    // Log. A hidden error is logged in full.
    this.log.save('http-response', responseObject);
    if (isError && message !== error.message) {
      this.log.save('response-error-hidden', { message: error.message, stack: error.stack, httpStatusCode, traceId: responseObject.traceId });
    }

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }
}
