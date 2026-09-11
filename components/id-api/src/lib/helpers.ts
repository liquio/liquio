import { AxiosError } from 'axios';
import crypto from 'crypto';
import { cloneDeep } from 'lodash';

import { typeOf } from './type_of';

const DEFAULT_LIMIT = 80;
const ENDING = '…';

export class Helpers {
  private static tryParseJson(str: string | Record<string, any>): any {
    if (typeOf(str) !== 'string') return str;

    try {
      return JSON.parse(str as string);
    } catch {
      // Ignoring JSON parse error and returning the original string
      return str;
    }
  }

  /**
   * Substring long strings in object. {str1: '12345', str2: '123456789'} => {str1: '12345', str2: '12345...'}
   */
  static cutLongStrings(strOrObj: string | Record<string, any>, limit = DEFAULT_LIMIT): string | Record<string, any> {
    const strOrObjPrepared = this.tryParseJson(strOrObj);

    if (typeOf(strOrObjPrepared) === 'string') {
      return strOrObjPrepared.length > limit ? `${strOrObjPrepared.substring(0, limit - ENDING.length)}${ENDING}` : strOrObjPrepared;
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
        return value.length > limitForObjValues ? `${value.substring(0, limitForObjValues - ENDING.length)}${ENDING}` : value;
      } else {
        return value;
      }
    });
    if (JSON.stringify(replacedObj).length <= limit) return replacedObj;

    let newLimitForObjValues = limitForObjValues / 10;
    while (newLimitForObjValues > 9) {
      replacedObj = this.replaceObjValues(cloneDeep(strOrObjPrepared), (value) => {
        if (typeOf(value) === 'string') {
          return value.length > newLimitForObjValues ? `${value.substring(0, newLimitForObjValues - ENDING.length)}${ENDING}` : value;
        } else {
          return value;
        }
      });
      if (JSON.stringify(replacedObj).length <= limit) return replacedObj;
      newLimitForObjValues = newLimitForObjValues / 10;
    }
    return JSON.stringify(replacedObj).substring(0, limit);
  }

  static shorten(str: string, limit = DEFAULT_LIMIT): string {
    if (str === undefined) {
      str = '';
    }
    if (typeof str !== 'string') {
      throw new TypeError('Expected a string input');
    }
    return str.length > limit ? `${str.substring(0, limit - ENDING.length)}${ENDING}` : str;
  }

  private static replaceObjValues(obj: any[] | Record<string, any>, handler = (value: any) => value): any {
    if (typeOf(obj) === 'array') {
      obj = obj.map((v: any) => this.replaceObjValues(v, handler));
    } else if (typeOf(obj) === 'object') {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          (obj as any)[key] = this.replaceObjValues((obj as any)[key], handler);
        }
      }
    } else {
      obj = handler(obj);
    }
    return obj;
  }

  static processError(error: unknown): { error: string; stack?: string } {
    if (error instanceof TypeError || error instanceof RangeError || error instanceof SyntaxError) {
      return {
        error: error.message,
        stack: error.stack,
      };
    }

    return { error: String(error) };
  }

  static prepareAxiosErrorToLog(error: Error | AxiosError, { withHeaders = false }: { withHeaders?: boolean } = {}): object | string {
    // Prepare axios error only.
    if (!(error instanceof AxiosError)) return error.toString();

    const result = {
      error: error.message ?? 'UNKNOWN_ERROR_MESSAGE',
      code: error.code ?? 'UNKNOWN_ERROR_CODE',
      status: error.response?.status ?? error.status ?? 'UNKNOWN_ERROR_STATUS',
      statusText: error.response?.statusText,
      responseData: error.response?.data ?? {},
      url: `${error.config?.baseURL}${error.config?.url}`,
      method: (error.config?.method ?? '').toUpperCase(),
      headers: error.response?.headers ?? {},
    };

    if (withHeaders) result.headers = error.config?.headers ?? {};

    return result;
  }
}

/**
 * Outputs a link to the user's avatar image depending on input gender.
 */
export function avatarByGender(gender?: string): string {
  return gender == 'male' ? '/img/avatar-male.svg' : '/img/avatar-female.svg';
}

// Source: https://emailregex.com/
const EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

/**
 * Validates if the provided email is in a valid format.
 */
export function validateEmail(email?: string): boolean {
  if (!email) return false;
  return EMAIL_REGEX.test(email);
}

/**
 * Asynchronously waits for a specified amount of time.
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generatePinCode(length: number): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const pinCode = crypto.randomInt(min, max + 1).toString();
  return pinCode;
}

export function generateRandomBase36(length: number): string {
  return parseInt(crypto.randomBytes(length).toString('hex'), 16).toString(36).slice(0, length);
}

export function shortenStringWithPrefixSuffix(str: string, prefixLength = 4, suffixLength = 4): string {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= prefixLength + suffixLength) return str;
  return `${str.slice(0, prefixLength)}…${str.slice(-suffixLength)}`;
}
