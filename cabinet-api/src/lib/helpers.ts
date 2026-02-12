import * as _ from 'lodash';
import { AxiosError } from 'axios';
import typeOf from './type_of';

interface CutStringsOptions {
  limit?: number;
}

interface AxiosErrorLog {
  error: string;
  code?: string;
  status?: number | string;
  statusText?: string;
  responseData?: Record<string, unknown>;
  url?: string;
  method?: string;
  headers?: Record<string, unknown>;
}

/**
 * Helper utility class with string and object manipulation methods
 */
export default class Helpers {
  /**
   * Substring long strings in object or string
   * @param strOrObj - String or object to process
   * @param limit - Maximum string length (default 80)
   * @returns Processed string or object with strings truncated
   */
  static cutLongStrings(strOrObj: string | Record<string, unknown>, limit: number = 80): string | Record<string, unknown> {
    let strOrObjPrepared: string | Record<string, unknown>;
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
      return (strOrObjPrepared as string).length > limit
        ? `${(strOrObjPrepared as string).substring(0, limit - ending.length)}${ending}`
        : strOrObjPrepared;
    }

    if (typeOf(strOrObjPrepared) !== 'object' && typeOf(strOrObjPrepared) !== 'array') {
      return strOrObjPrepared;
    }

    // FIX: Changed typeOf(strOrObjPrepared === 'object') to typeOf(strOrObjPrepared) === 'object'
    if (typeOf(strOrObjPrepared) === 'object' && JSON.stringify(strOrObjPrepared).length <= limit) {
      return strOrObjPrepared;
    }

    const limitForObjValues = limit > 1000 ? limit / 100 : 10;
    let replacedObj = this.replaceObjValues(_.cloneDeep(strOrObjPrepared), (value) => {
      if (typeOf(value) === 'string') {
        return (value as string).length > limitForObjValues
          ? `${(value as string).substring(0, limitForObjValues - ending.length)}${ending}`
          : value;
      }
      return value;
    });
    if (JSON.stringify(replacedObj).length <= limit) return replacedObj;

    let newLimitForObjValues = limitForObjValues / 10;
    while (newLimitForObjValues > 9) {
      replacedObj = this.replaceObjValues(_.cloneDeep(strOrObjPrepared), (value) => {
        if (typeOf(value) === 'string') {
          return (value as string).length > newLimitForObjValues
            ? `${(value as string).substring(0, newLimitForObjValues - ending.length)}${ending}`
            : value;
        }
        return value;
      });
      if (JSON.stringify(replacedObj).length <= limit) return replacedObj;
      newLimitForObjValues = newLimitForObjValues / 10;
    }
    return JSON.stringify(replacedObj).substring(0, limit);
  }

  /**
   * Replace values in object recursively
   * @param obj - Object to process
   * @param handler - Function to apply to each value
   * @returns Processed object
   */
  static replaceObjValues(obj: any, handler: (value: any) => any = (value) => value): any {
    if (typeOf(obj) === 'array') {
      obj = (obj as any[]).map((v) => this.replaceObjValues(v, handler));
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
   * Prepare axios error for logging
   * @param error - Error object (should be AxiosError)
   * @param options - Options for error preparation
   * @param options.withHeaders - Whether to include request headers
   * @returns Processed error object for logging
   */
  static prepareAxiosErrorToLog(error: any, { withHeaders = false }: { withHeaders?: boolean } = {}): AxiosErrorLog {
    // Prepare axios error only.
    if (!(error instanceof AxiosError)) return { error: error.toString() };
    const result: AxiosErrorLog = {
      error: error.message || 'UNKNOWN_ERROR_MESSAGE',
      code: error.code || 'UNKNOWN_ERROR_CODE',
      status: error.response?.status || error.status || 'UNKNOWN_ERROR_STATUS',
      statusText: error.response?.statusText,
      responseData: error.response?.data || {},
      url: `${error.config?.baseURL ? error.config.baseURL : ''}${error.config?.url}`,
      method: (error.config?.method || '').toUpperCase(),
    };
    if (withHeaders) result.headers = error.config?.headers || {};
    return result;
  }
}
