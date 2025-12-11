const _ = require('lodash');
const { AxiosError } = require('axios');

const typeOf = require('./type_of');

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
      } catch (error) {
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
      for (let key in obj) {
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
    const result = {
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
}

module.exports = Helpers;
