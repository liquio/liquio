import { getIdApiClient, IdApiClient } from '@liquio/back-core';

// Constants.
const DEFAULT_TIMEOUT = 30000;

/**
 * Init the shared id-api client from the `auth.LiquioId` config section. Call once on startup,
 * after the global log is set. Everywhere else use `getIdApiClient()` without arguments.
 * @param {object} authConfig Id-api config section (`config.auth.LiquioId`).
 * @returns {IdApiClient}
 */
export function initIdApiClient(authConfig: Record<string, any> = {}): IdApiClient {
  return getIdApiClient({
    server: authConfig.server,
    port: authConfig.port,
    routes: authConfig.routes,
    timeout: authConfig.timeout || DEFAULT_TIMEOUT,
    clientId: authConfig.clientId,
    clientSecret: authConfig.clientSecret,
    basicAuthToken: authConfig.basicAuthToken,
    // Task works with 24-character user IDs only.
    strictIds: true,
    getLog: () => global.log,
  });
}
