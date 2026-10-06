// Import.
import { Stream } from 'node:stream';

import _ from 'lodash';
import { AxiosError } from 'axios';

import { getConfig } from './context';
import typeOf from './type_of';

const MIME_TYPES = {
  PDF: [0x25, 0x50, 0x44, 0x46],
  'APPLICATION/PDF': [0x25, 0x50, 0x44, 0x46],
  JPEG: [0xff, 0xd8, 0xff],
  'IMAGE/JPEG': [0xff, 0xd8, 0xff],
  JPG: [0xff, 0xd8, 0xff],
  'IMAGE/JPG': [0xff, 0xd8, 0xff],
};

const DEFAULT_EXCLUDE_PARAMS = [
  'token',
  'oauth-token',
  'authorization',
  'Authorization',
  'secret',
  'password',
  'oldPassword',
  'oldPasswords',
  '_token=', // params with '=' at the end mean that they are parameters in the query string.
];

class Helpers {
  constructor() {}

  /**
   * @param {string} userId
   * @return {Promise<{head: Array<number>, all: Array<number>, member: Array<number>}>}
   */
  static async getUserUnits(userId) {
    const units = await models.unit.getAll();
    const defaultUnits = getConfig().auth.defaultUnits || [];
    const head = units.filter((v) => v.heads.includes(userId)).map((v) => v.id);
    const member = units.filter((v) => v.members.includes(userId) || defaultUnits.includes(v.id)).map((v) => v.id);
    return { head, member, all: [...new Set([...head, ...member])] };
  }

  /**
   * @param {string} userId
   * @return {Promise<{userId: string, userUnits: {head: Array<number>, all: Array<number>, member: Array<number>}}>}
   */
  static async appendUnitIdsToUser(userId) {
    const units = await models.unit.getAll();
    const defaultUnits = getConfig().auth.defaultUnits || [];
    const head = units.filter((v) => v.heads.includes(userId)).map((v) => v.id);
    const member = units.filter((v) => v.members.includes(userId) || defaultUnits.includes(v.id)).map((v) => v.id);
    return { userId, userUnits: { head, member, all: [...new Set([...head, ...member])] } };
  }

  /**
   * @param {Array<string>} userIds
   * @return {Promise<Array<{userId: string, userUnits: {head: Array<number>, all: Array<number>, member: Array<number>}}>>}
   */
  static async appendUnitIdsToUsers(userIds) {
    const units = await models.unit.getAll();
    const defaultUnits = getConfig().auth.defaultUnits || [];
    return userIds.map((userId) => {
      const head = units.filter((v) => v.heads.includes(userId)).map((v) => v.id);
      const member = units.filter((v) => v.members.includes(userId) || defaultUnits.includes(v.id)).map((v) => v.id);
      return { userId, userUnits: { head, member, all: [...new Set([...head, ...member])] } };
    });
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

    const limitForObjValues = limit > 1000 ? limit / 100 : 10;
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
      obj = obj.map((v) => this.replaceObjValues(v, handler));
    } else if (typeOf(obj) === 'object') {
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          obj[key] = this.replaceObjValues(obj[key], handler);
        }
      }
    } else {
      obj = handler(obj);
    }
    return obj;
  }

  /**
   * @param {Object} targetObject
   * @param {string[]} excludeParams
   * @param {string[]} replaceMask
   * @return {string} "Clear" string - without sensitive data.
   */
  static sensitiveReplace(targetObject, excludeParams = DEFAULT_EXCLUDE_PARAMS, replaceMask = '****') {
    if (typeof targetObject !== 'string' || excludeParams.length === 0) {
      return targetObject;
    }
    const excludeParamsJson = excludeParams.filter((p) => !p.endsWith('='));
    const excludeParamsQuery = excludeParams.filter((p) => p.endsWith('='));

    let resultString = targetObject;

    if (excludeParamsJson.length) {
      // Regex example: /"(token|oauth-token|authorization|Authorization|secret|password|oldPassword|oldPasswords)": ?"(.+?)"/gm
      const regexForJson = new RegExp(`"(${excludeParamsJson.join('|')})": ?"(.+?)"`, 'gm');
      const matchesInJson = [...resultString.matchAll(regexForJson)];
      if (matchesInJson.length) {
        matchesInJson.forEach(([stringToReplace, , value]) => {
          resultString = resultString.replace(stringToReplace, stringToReplace.replace(value, replaceMask));
        });
      }
    }
    if (excludeParamsQuery.length) {
      // Regex example: /(_token=)[^&"]*/gm
      const regexForQuery = new RegExp(`(${excludeParamsQuery.join('|')})[^&"]*`, 'gm');
      const matchesInQuery = [...resultString.matchAll(regexForQuery)];
      if (matchesInQuery.length) {
        matchesInQuery.forEach(([stringToReplace, value]) => {
          resultString = resultString.replace(stringToReplace, `${value}${replaceMask}`);
        });
      }
    }

    return resultString;
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
   * Transform function to async.
   * @param {string} functionString Function string.
   * @param {array} [allowedAsyncFunctions] Allowed async functions.
   * @returns {string} Async function string.
   */
  static transformFunctionToAsync(functionString, allowedAsyncFunctions = []) {
    // Define params.
    const isFunctionStringContainsAsyncFunction = allowedAsyncFunctions.some(
      (v) => functionString.includes(v) && !functionString.includes(`await ${v}`),
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
      asyncFunctionString = asyncFunctionString.replace(new RegExp(`(?<!\\.)\\b${asyncFunctionInside}\\b`, 'g'), `await ${asyncFunctionInside}`);
    }

    // Return transformed function.
    return asyncFunctionString;
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
      responseData:
        responseData instanceof Stream
          ? (responseData?.constructor?.name && `${responseData.constructor.name} stream`) || 'stream.Stream'
          : responseData || {}, // { "error": "File not found" }
      url: `${error.config?.baseURL ? error.config.baseURL : ''}${error.config?.url}`, // "https://api.example.com/files/12345"
      method: (error.config?.method || '').toUpperCase(), // GET || POST
    };
    if (withHeaders) result.headers = error.config?.headers || {};
    return result;
  }
}

export default Helpers;
