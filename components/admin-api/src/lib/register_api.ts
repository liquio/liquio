import { getRegisterApiClient, RegisterApiClient, RegisterApiError } from '@liquio/back-core';

import { getLog } from './context';

// Constants.
const DEFAULT_TIMEOUT = 30000;

/**
 * Init the shared register client from the `register` config section. Call once on startup,
 * after the global log is set. Everywhere else use `getRegisterApiClient()` without arguments.
 * @param {object} registerConfig Register config section.
 * @returns {RegisterApiClient}
 */
export function initRegisterApiClient(registerConfig: Record<string, any> = {}): RegisterApiClient {
  return getRegisterApiClient({
    server: registerConfig.server,
    port: registerConfig.port,
    token: registerConfig.token,
    timeout: registerConfig.timeout || DEFAULT_TIMEOUT,
    getLog,
  });
}

/**
 * Run a register client call with admin-api's historical error handling: an HTTP error status is logged
 * and hidden (the error body or `undefined` is returned), any other failure is rethrown as a plain `Error`
 * with the message only.
 * @param {string} logName Log record name.
 * @param {Function} call Register client call.
 * @param {'body'|'undefined'} onHttpError What to return on an HTTP error status.
 * @returns {Promise<any>}
 */
export async function callRegisterLegacy<T>(logName: string, call: () => Promise<T>, onHttpError: 'body' | 'undefined'): Promise<T | any> {
  try {
    return await call();
  } catch (error: any) {
    if (error instanceof RegisterApiError && error.code === 'HTTP_ERROR') {
      getLog().save(logName, { status: error.status, error: error.message }, 'warn');
      return onHttpError === 'body' ? error.body : undefined;
    }
    getLog().save(logName, { error: error?.message });
    throw new Error(error?.message);
  }
}
