import path from 'path';

import _ from 'lodash';
import { AxiosError } from 'axios';

import { typeOf } from './type_of';

const UUID_REGEXP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class Helpers {
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
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          obj[key] = this.replaceObjValues(obj[key], handler);
        }
      }
    } else {
      obj = handler(obj);
    }
    return obj;
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
    const result: any = {
      error: error.message || 'UNKNOWN_ERROR_MESSAGE', // "Request failed with status code 404 || "timeout of 30000ms exceeded"
      code: error.code || 'UNKNOWN_ERROR_CODE', // "ERR_BAD_REQUEST" || "ESOCKETTIMEDOUT"
      status: error.response?.status || error.status || 'UNKNOWN_ERROR_STATUS', // 404 || 500 || "UNKNOWN_ERROR_STATUS"
      statusText: error.response?.statusText, // "Not Found" || null
      responseData: error.response?.data || {}, // { "error": "File not found" }
      url: `${error.config?.baseURL ? error.config.baseURL : ''}${error.config?.url}`, // "https://api.example.com/files/12345"
      method: (error.config?.method || '').toUpperCase(), // GET || POST
    };
    if (withHeaders) result.headers = error.config?.headers || {};
    return result;
  }

  /**
   * Parse and validate a list of file IDs: trims, drops empties, dedupes, checks UUID format and count.
   * @param {string|any[]} raw Comma separated string or array of IDs.
   * @param {number} max Max number of unique IDs.
   * @returns {string[]} Unique IDs.
   * @throws {Error & {status: number}} 400 when input is malformed or exceeds `max`.
   */
  static parseIds(raw, max: number): string[] {
    const fail = (message: string) => Object.assign(new Error(message), { status: 400 });

    let list;
    if (typeof raw === 'string') {
      list = raw.split(',');
    } else if (Array.isArray(raw)) {
      list = raw;
    } else {
      throw fail('Files IDs should be an array.');
    }

    const ids = new Set<string>();
    for (const item of list) {
      if (typeof item !== 'string') {
        throw fail('Invalid file ID.');
      }
      const id = item.trim();
      if (!id) continue;
      if (!UUID_REGEXP.test(id)) {
        throw fail('Invalid file ID.');
      }
      ids.add(id.toLowerCase());
      if (ids.size > max) {
        throw fail(`Too many files. Max ${max}.`);
      }
    }
    return [...ids];
  }

  /**
   * Make a stored file name safe to use as a single ZIP entry name: keeps only the last path segment
   * (both `/` and `\\` are separators), strips control characters and never returns `.`, `..` or empty.
   * @param {any} name Raw file name.
   * @returns {string} Safe entry name without path separators.
   */
  static safeEntryName(name): string {
    const FALLBACK = 'file';
    if (typeof name !== 'string') return FALLBACK;
    const cleaned = name.replace(/\\/g, '/').replace(/[\u0000-\u001f\u007f]/g, '');
    const base = path.posix.basename(cleaned).trim();
    if (!base || /^\.+$/.test(base)) return FALLBACK;
    return base;
  }
}
