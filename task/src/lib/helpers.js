const _ = require('lodash');
const { AxiosError } = require('axios');

const typeOf= require('./type_of');

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
   * @param {string} userId
   * @return {Promise<{head: Array<number>, all: Array<number>, member: Array<number>}>}
   */
  static async getUserUnits(userId) {
    const units = await models.unit.getAll();
    const defaultUnits = global.config.auth.defaultUnits || [];
    const head = units.filter(v => v.heads.includes(userId)).map(v => v.id);
    const member = units.filter(v => v.members.includes(userId) || defaultUnits.includes(v.id)).map(v => v.id);
    return { head, member, all: [...new Set([...head, ...member])] };
  }

  /**
   * @param {string} userId
   * @return {Promise<{userId: string, userUnits: {head: Array<number>, all: Array<number>, member: Array<number>}}>}
   */
  static async appendUnitIdsToUser(userId) {
    const units = await models.unit.getAll();
    const defaultUnits = global.config.auth.defaultUnits || [];
    const head = units.filter(v => v.heads.includes(userId)).map(v => v.id);
    const member = units.filter(v => v.members.includes(userId) || defaultUnits.includes(v.id)).map(v => v.id);
    return { userId, userUnits: { head, member, all: [...new Set([...head, ...member])] } };
  }

  /**
   * @param {Array<string>} userIds
   * @return {Promise<Array<{userId: string, userUnits: {head: Array<number>, all: Array<number>, member: Array<number>}}>>}
   */
  static async appendUnitIdsToUsers(userIds) {
    const units = await models.unit.getAll();
    const defaultUnits = global.config.auth.defaultUnits || [];
    return userIds.map((userId) => {
      const head = units.filter(v => v.heads.includes(userId)).map(v => v.id);
      const member = units.filter(v => v.members.includes(userId) || defaultUnits.includes(v.id)).map(v => v.id);
      return { userId, userUnits: { head, member, all: [...new Set([...head, ...member])] } };
    });
  }

  /**
   * @static
   * @param {Array<Object>} items
   * @param {function} callbackFn
   * @return {Object}
   */
  static groupBy(items, callbackFn) {
    return items.reduce((acc, item) => {
      if (!acc[callbackFn(item)]) {
        acc[callbackFn(item)] = [];
      }
      acc[callbackFn(item)].push(item);
      return acc;
    }, {});
  }

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
    };
    return JSON.stringify(replacedObj).substring(0, limit);
  };

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
   * @static
   * @param {Buffer} buffer
   * @param {string} mimeType
   * @return {boolean}
   */
  static isCorrectBufferMimeType(buffer, mimeType) {
    if (typeOf(buffer) !== 'uint8array') {
      throw new Error('isCorrectBufferMimeType. Invalid buffer argument.');
    }

    mimeType = mimeType?.toUpperCase();

    if (!MIME_TYPES[mimeType]) {
      throw new Error('isCorrectBufferMimeType. Unknown mimeType argument.');
    }

    return MIME_TYPES[mimeType].every((byte, index) => byte === buffer[index]);
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
    if (!(error instanceof AxiosError)) return error.toString();
    const result = {
      error: error.message || 'UNKNOWN_ERROR_MESSAGE',
      code: error.code || 'UNKNOWN_ERROR_CODE',
      status: error.response?.status || error.status || 'UNKNOWN_ERROR_STATUS',
      statusText: error.response?.statusText,
      responseData: error.response?.data || {},
      url: `${error.config?.baseURL}${error.config?.url}`,
      method: (error.config?.method || '').toUpperCase(),
    };
    if (withHeaders) result.headers = error.config?.headers || {};
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
        new RegExp(asyncFunctionInside, 'g'),
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
