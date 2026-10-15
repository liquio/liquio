import stream from 'node:stream';

import { transliterate } from 'transliteration';
import _ from 'lodash';
import { getTraceId } from '@liquio/back-core';

const HTTP_STATUS_CODE_OK = 200;
const HTTP_STATUS_CODE_SERVER_ERROR = 500;
const EMPTY_DATA = null;
const CONTENT_TYPE_HEADER = 'Content-Type';
const CONTENT_LENGTH_HEADER = 'Content-Length';
const CONTENT_DISPOSITION_HEADER = 'Content-Disposition';
const CONTENT_TYPE_OPTIONS_HEADER = 'X-Content-Type-Options';
const DEFAULT_FILE_NAME = 'file';
const DEFAULT_ERROR_MESSAGE = 'Server error.';
const RESPONSE_REPLACEMENT_TEXT = '*****';

/**
 * Controller.
 */
export class Controller {
  config: any;

  /**
   * Controller constructor.
   * @param {object} config Config object.
   */
  constructor(config?: any) {
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
  responseData(res, data: any = EMPTY_DATA, meta?, httpStatusCode = HTTP_STATUS_CODE_OK) {
    // Define response object.
    const responseObject = { data, meta };

    // Log.
    global.log.save('http-response', { data: RESPONSE_REPLACEMENT_TEXT });

    // Response.
    res.status(httpStatusCode).send(responseObject);
  }

  /**
   * Build safe attachment Content-Disposition value.
   * @param {string} [fileName] File name.
   * @returns {string} Header value.
   */
  static buildContentDisposition(fileName?: any): string {
    const cleanName = String(fileName ?? '')
      .replace(/[\r\n"\\]/g, '')
      .trim();
    if (!cleanName) {
      return `attachment; filename="${DEFAULT_FILE_NAME}"`;
    }
    const asciiName =
      _.toLower(transliterate(cleanName))
        .replace(/\s+/g, '_')
        .replace(/(?![a-zA-Z0-9._-]+)\S/g, '_') || DEFAULT_FILE_NAME;
    const encodedName = encodeURIComponent(cleanName).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`;
  }

  /**
   * Response file.
   * @param {object} res HTTP response.
   * @param {Buffer} file File content as buffer.
   * @param {string} [contentType] Content-type.
   * @param {string} [contentLength] Content-length.
   * @param {string} [fileName] File name.
   */
  responseFile(res, file: any, contentType?, contentLength?, fileName?) {
    // Response.
    if (contentType) {
      res.set(CONTENT_TYPE_HEADER, contentType);
    }
    if (contentLength) {
      res.set(CONTENT_LENGTH_HEADER, contentLength);
    }
    // Never serve stored content inline.
    res.set(CONTENT_DISPOSITION_HEADER, Controller.buildContentDisposition(fileName));
    res.set(CONTENT_TYPE_OPTIONS_HEADER, 'nosniff');
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
  responseError(res, error: any = DEFAULT_ERROR_MESSAGE, httpStatusCode = HTTP_STATUS_CODE_SERVER_ERROR) {
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
