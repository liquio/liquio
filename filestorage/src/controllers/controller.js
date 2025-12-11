const stream = require('stream');
const transliteration = require('transliteration');
const _ = require('lodash');

const { getTraceId } = require('../lib/async_local_storage');

const HTTP_STATUS_CODE_OK = 200;
const HTTP_STATUS_CODE_SERVER_ERROR = 500;
const EMPTY_DATA = null;
const CONTENT_TYPE_HEADER = 'Content-Type';
const CONTENT_LENGTH_HEADER = 'Content-Length';
const CONTENT_DISPOSITION_HEADER = 'Content-Disposition';
const DEFAULT_ERROR_MESSAGE = 'Server error.';
const RESPONSE_REPLACEMENT_TEXT = '*****';

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
   * @param {object} [meta] Meta info to response.
   * @param {number} [httpStatusCode] HTTP status code.
   */
  responseData(res, data = EMPTY_DATA, meta, httpStatusCode = HTTP_STATUS_CODE_OK) {
    // Define response object.
    const responseObject = { data, meta };

    // Log.
    log.save('http-response', { data: RESPONSE_REPLACEMENT_TEXT });

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }

  /**
   * Response file.
   * @param {object} res HTTP response.
   * @param {Buffer} file File content as buffer.
   * @param {string} [contentType] Content-type.
   * @param {string} [contentLength] Content-length.
   * @param {string} [fileName] File name.
   */
  responseFile(res, file, contentType, contentLength, fileName) {
    // Response.
    if (contentType) {
      res.set(CONTENT_TYPE_HEADER, contentType);
    }
    if (contentLength) {
      res.set(CONTENT_LENGTH_HEADER, contentLength);
    }
    if (fileName) {
      const convertedFileName = _.toLower(transliteration.transliterate(fileName))
        .replace(/\s+/g, '_')
        .replace(/(?![a-zA-Z0-9._-]+)\S/g, '_');
      res.set(CONTENT_DISPOSITION_HEADER, `attachment; filename="${convertedFileName}"`);
    }
    if (file instanceof stream.Readable || file._read || file._readableState) {
      file.pipe(res);
    } else {
      res.send(file);
    }
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

// Export.
module.exports = Controller;
