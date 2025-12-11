const _ = require('lodash');
const crypto = require('crypto');
const Sequelize = require('sequelize');
const { AxiosError } = require('axios');
const { Stream } = require('stream');

const typeOf = require('./type_of');

const MIME_TYPES = {
  'PDF': [0x25, 0x50, 0x44, 0x46],
  'APPLICATION/PDF': [0x25, 0x50, 0x44, 0x46],
  'JPEG': [0xFF, 0xD8, 0xFF],
  'IMAGE/JPEG': [0xFF, 0xD8, 0xFF],
  'JPG': [0xFF, 0xD8, 0xFF],
  'IMAGE/JPG': [0xFF, 0xD8, 0xFF]
};

class Helpers {
  /**
   * Substring long strings in object. {str1: '12345', str2: '123456789'} => {str1: '12345', str2: '12345...'}
   * @param {Object|String} strOrObj
   * @param {number} [limit=80]
   * @return {Object|String}
   */
  static cutLongStrings(strOrObj, limit = 80) {
    let strOrObjPrepared;
    if (typeOf(strOrObj) === 'string') {
      try {
        strOrObjPrepared = JSON.parse(strOrObj);
      } catch {
        strOrObjPrepared = strOrObj;
      }
    } else {
      strOrObjPrepared = strOrObj;
    }

    const ending = '...';

    if (typeOf(strOrObjPrepared) === 'string') {
      return strOrObjPrepared.length > limit ? `${strOrObjPrepared.substring(0, limit - ending.length)}${ending}` : strOrObjPrepared;
    }

    if (typeOf(strOrObjPrepared) !== 'object' && typeOf(strOrObjPrepared) !== 'array') {
      return strOrObjPrepared;
    }

    if (typeOf(strOrObjPrepared === 'object')) {
      strOrObjPrepared = this.stripSequelize(strOrObjPrepared);
    }

    if (typeOf(strOrObjPrepared === 'object') && JSON.stringify(strOrObjPrepared).length <= limit) {
      return strOrObjPrepared;
    }

    const limitForObjValues = limit > 1000 ? (limit / 100) : 10;
    let replacedObj = this.replaceObjValues(_.cloneDeep(strOrObjPrepared), (value) => {
      if (typeOf(value) === 'string') {
        return value.length > limitForObjValues ? `${value.substring(0, limitForObjValues - ending.length)}${ending}` : value;
      } else {
        return value;
      }
    });
    if (JSON.stringify(replacedObj).length <= limit) return replacedObj;

    let newLimitForObjValues = limitForObjValues / 10;
    while (newLimitForObjValues > 9) {
      replacedObj = this.replaceObjValues(_.cloneDeep(strOrObjPrepared), (value) => {
        if (typeOf(value) === 'string') {
          return value.length > newLimitForObjValues ? `${value.substring(0, newLimitForObjValues - ending.length)}${ending}` : value;
        } else {
          return value;
        }
      });
      if (JSON.stringify(replacedObj).length <= limit) return replacedObj;
      newLimitForObjValues = newLimitForObjValues / 10;
    }
    return JSON.stringify(replacedObj).substring(0, limit);
  }

  /**
   * @private
   * @param {Object} obj
   * @param {function} handler
   * @return {Object}
   */
  static replaceObjValues(obj, handler = (value) => value) {
    if (typeOf(obj) === 'array') {
      return obj.map(v => this.replaceObjValues(v, handler));
    } else if (typeOf(obj) === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        obj[key] = this.replaceObjValues(value, handler);
      }
      return obj;
    }

    return handler(obj);
  }

  /**
   * Strip Sequelize objects recursively to avoid circular references.
   * @param {object} obj
   * @returns {object}
   */
  static stripSequelize(obj) {
    if (obj instanceof Sequelize) {
      return '$Sequelize';
    }

    if (typeOf(obj) === 'array') {
      return obj.map(v => this.stripSequelize(v));
    }

    if (typeOf(obj) === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        obj[key] = this.stripSequelize(value);
      }
    }

    return obj;
  }

  /*
  * @param {Object} obj
  * @param {function} check
  * @param {function} handler
  * @param {Array} [path=[]]
  * @return {void}
  * */
  static deepFind(obj, check, handler, path = []) {
    if (check(obj, path)) {
      handler(obj, path);
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        this.deepFind(obj[i], check, handler, [...path, i]);
      }
    } else if (typeof obj === 'object') {
      for (const key in obj) {
        this.deepFind(obj[key], check, handler, [...path, key]);
      }
    }
  }

  /**
   * @static
   * @param {Buffer} buffer
   * @param {string} mimeType
   * @return {boolean}
   */
  static isCorrectBufferMimeType(buffer, mimeType) {
    if (typeOf(buffer) !== 'buffer') {
      throw new Error('isCorrectBufferMimeType. Invalid buffer argument.');
    }

    mimeType = mimeType?.toUpperCase();

    if (!MIME_TYPES[mimeType]) {
      throw new Error('isCorrectBufferMimeType. Unknown mimeType argument.');
    }

    return MIME_TYPES[mimeType].every((byte, index) => byte === buffer[index]);
  }

  /**
   * @param {string|Buffer|TypedArray} data
   * @return {string}
   */
  static getSha256HashHex(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * @static
   * @param {error} error. AxiosError.
   * @param {object} options. Options.
   * @param {boolean} options.withHeaders With headers.
   * @return {object} Object to log.
   */
  static prepareAxiosErrorToLog(error, { withHeaders = false } = {}) {
    // Prepare axios error only.
    if (!(error instanceof AxiosError)) return { error: error.toString() };
    const responseData = error.response?.data;
    const result = {
      error: error.message || 'UNKNOWN_ERROR_MESSAGE', // "Request failed with status code 404" || "timeout of 30000ms exceeded"
      code: error.code || 'UNKNOWN_ERROR_CODE', // "ERR_BAD_REQUEST" || "ESOCKETTIMEDOUT"
      status: error.response?.status || error.status || 'UNKNOWN_ERROR_STATUS', // 404 || 500 || "UNKNOWN_ERROR_STATUS"
      statusText: error.response?.statusText, // "Not Found" || null
      responseData: responseData instanceof Stream
        ? (responseData?.constructor?.name && `${responseData.constructor.name} stream` || 'stream.Stream')
        : (responseData || {}), // { "error": "File not found" }
      url: `${error.config?.baseURL ? error.config.baseURL : ''}${error.config?.url}`, // "https://api.example.com/files/12345"
      method: (error.config?.method || '').toUpperCase(), // GET || POST
    };
    if (withHeaders) result.headers = error.config?.headers || {};
    return result;
  }

  static splitArrayIntoChunks(array, chunkSize) {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  }

  /**
   * Helper to stringify different types of errors.
   * @static
   * @param {Error} error. Error.
   * @return {string} Stringified error.
   */
  static stringifyError(error, ...params) {
    try {
      // Case - AxiosError.
      if (error instanceof AxiosError) return Helpers.stringifyAxiosError(error, ...params);
      // TODO: add other error types processing.

      // Default.
      return error.toString();

    } catch (error) {
      return typeof error?.toString === 'function' ? error.toString() : error;
    }
  }

  /**
   * Stringifies an AxiosError.
   * @static
   * @param {AxiosError} error. AxiosError.
   * @return {string} Stringified error. Example: "Axios error - ERR_BAD_REQUEST - Request failed with status code 400 - {\"message\":\"Sign is required\",\"error\":\"Bad Request\",\"statusCode\":400}"
   */
  static stringifyAxiosError(error) {
    // Stringify axios error only.
    if (!(error instanceof AxiosError)) return error.toString();

    const name = error.name; // "AxiosError"
    const code = error.code; // "ERR_BAD_REQUEST" || "ESOCKETTIMEDOUT"
    const message = error.message; // "Request failed with status code 404 || "timeout of 30000ms exceeded"
    const responseDataRaw = error.response?.data;
    const responseData = responseDataRaw instanceof Stream
      ? undefined
      : ((typeof responseDataRaw === 'object' && responseDataRaw !== null) ? JSON.stringify(responseDataRaw) : responseDataRaw);

    // "Axios error - ERR_BAD_REQUEST - Request failed with status code 400 - {\"message\":\"Sign is required\",\"error\":\"Bad Request\",\"statusCode\":400}"
    return `${name} - ${code} - ${message}${responseData ? ` - ${responseData}` : ''}`;
  }

  static async getSignaturesInfoByDocumentId(documentId, options = {}) {
    const { withContent = false } = options;

    // Initialize EDS.
    let edsService;
    try {
      edsService = await (require('./eds')).getInstance();
    } catch (error) {
      throw new Error(`Cannot initialize EDS service.${error.message}`, { cause: error });
    }

    // Get document signatures.
    const documentSignatures = await global.models.documentSignature.findByDocumentId(documentId);
    if (!Array.isArray(documentSignatures) || documentSignatures.length === 0) {
      throw new Error('Document signatures not found.');
    }
    const parsedSignatures = documentSignatures.map(({ signature }) => JSON.parse(signature)[0]);

    // Get signature info for each signature.
    const result = [];
    for (const signature of parsedSignatures) {
      const info = await edsService.getSignatureInfo(signature);
      if (!withContent && info.content) {
        delete info.content;
      }
      result.push(info);
    }
    return result;
  }

  /**
   * Transform function to async.
   * @param {string} functionString Function string.
   * @param {array} [allowedAsyncFunctions] Allowed async functions.
   * @returns {string} Async function string.
   */
  static transformFunctionToAsync (functionString, allowedAsyncFunctions = []) {
    // Define params.
    const isFunctionStringContainsAsyncFunction = allowedAsyncFunctions.some(
      (v) => functionString.includes(v) && !functionString.includes(`await ${v}`)
    );

    // Return as is if async function not used.
    if (!isFunctionStringContainsAsyncFunction) {
      return functionString;
    }

    // Transform to async.
    let asyncFunctionString = functionString;
    if (!asyncFunctionString.startsWith('async')) {
      asyncFunctionString = `async ${asyncFunctionString}`;
    }
    for (const asyncFunctionInside of allowedAsyncFunctions) {
      asyncFunctionString = asyncFunctionString.replace(
        new RegExp(`(?<!\\.)\\b${asyncFunctionInside}\\b`, 'g'),
        `await ${asyncFunctionInside}`
      );
    }

    // Return transformed function.
    return asyncFunctionString;
  }

  // /**
  //  * @static
  //  * @param {ReadableStream} readableStream
  //  * @param {string} mimeType
  //  * @return {Promise<boolean>}
  //  */
  // static async isCorrectStreamMimeType(readableStream, mimeType) {
  //   if (!readableStream instanceof Readable) {
  //     throw new Error('isCorrectStreamMimeType. Invalid readableStream argument.');
  //   }
  //
  //   mimeType = mimeType?.toUpperCase();
  //
  //   if (!MIME_TYPES[mimeType]) {
  //     throw new Error('isCorrectStreamMimeType. Unknown mimeType argument.');
  //   }
  //
  //   return await new Promise((resolve, reject) => {
  //     function check(data) {
  //       const chunk = data;
  //
  //       // Unsubscribe, we will read only once.
  //       readableStream.removeListener('data', check);
  //
  //       // Read first 20 bites.
  //
  //       if (!chunk) {
  //         return reject(new Error('isCorrectStreamMimeType. Cannot read chunk from readable stream.'));
  //       }
  //
  //       resolve(MIME_TYPES[mimeType].every((byte, index) => byte === chunk[index]));
  //     }
  //
  //     // Subscribe.
  //     readableStream.on('data', check);
  //   });
  // }
}

module.exports = Helpers;
