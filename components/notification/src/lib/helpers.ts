import { cloneDeep } from 'lodash';
import { typeOf } from './type_of';

export class Helpers {
  /**
   * Substring long strings in object. {str1: '12345', str2: '123456789'} => {str1: '12345', str2: '12345...'}
   * @param {Object|String} strOrObj
   * @param {number} [limit=80]
   * @return {Object|String}
   */
  static cutLongStrings(strOrObj: unknown, limit = 80): unknown {
    let strOrObjPrepared: unknown;
    if (typeOf(strOrObj) === 'string') {
      try {
        strOrObjPrepared = JSON.parse(strOrObj as string);
      } catch {
        strOrObjPrepared = strOrObj;
      }
    } else {
      strOrObjPrepared = strOrObj;
    }

    const ending = '...';

    if (typeOf(strOrObjPrepared) === 'string') {
      const str = strOrObjPrepared as string;
      return str.length > limit ? `${str.substring(0, limit - ending.length)}${ending}` : str;
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
        const str = value as string;
        return str.length > limitForObjValues ? `${str.substring(0, limitForObjValues - ending.length)}${ending}` : str;
      } else {
        return value;
      }
    });
    if (JSON.stringify(replacedObj).length <= limit) return replacedObj;

    let newLimitForObjValues = limitForObjValues / 10;
    while (newLimitForObjValues > 9) {
      replacedObj = this.replaceObjValues(cloneDeep(strOrObjPrepared), (value) => {
        if (typeOf(value) === 'string') {
          const str = value as string;
          return str.length > newLimitForObjValues ? `${str.substring(0, newLimitForObjValues - ending.length)}${ending}` : str;
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
  static replaceObjValues(obj: any, handler: (value: unknown) => unknown = (value) => value): any {
    if (typeOf(obj) === 'array') {
      obj = obj.map((v: unknown) => this.replaceObjValues(v, handler));
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
}
