import { getIdApiClient, IdApiClient } from '@liquio/back-core';

// Constants.
const DEFAULT_TIMEOUT = 30000;

/**
 * Init the shared id-api client from the `LiquioId` config section of the user config. Call once on startup,
 * after the global log is set. Everywhere else use `getIdApiClient()` without arguments.
 * @param {object} liquioIdConfig Id-api config section (`config.user.LiquioId`).
 * @returns {IdApiClient}
 */
export function initIdApiClient(liquioIdConfig: Record<string, any> = {}): IdApiClient {
  return getIdApiClient({
    server: liquioIdConfig.server,
    port: liquioIdConfig.port,
    routes: liquioIdConfig.routes,
    timeout: liquioIdConfig.timeout || DEFAULT_TIMEOUT,
    clientId: liquioIdConfig.clientId,
    clientSecret: liquioIdConfig.clientSecret,
    basicAuthToken: liquioIdConfig.basicAuthToken,
    getLog: () => global.log,
  });
}
