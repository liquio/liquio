const { cloneDeep } = require('lodash');
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
    let replacedObj = this.replaceObjValues(cloneDeep(strOrObjPrepared), (value) => {
      if (typeOf(value) === 'string') {
        return value.length > limitForObjValues ? `${value.substring(0, limitForObjValues - ending.length)}${ending}` : value;
      } else {
        return value;
      }
    });
    if (JSON.stringify(replacedObj).length <= limit) return replacedObj;

    let newLimitForObjValues = limitForObjValues / 10;
    while (newLimitForObjValues > 9) {
      replacedObj = this.replaceObjValues(cloneDeep(strOrObjPrepared), (value) => {
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
}

module.exports = Helpers;
