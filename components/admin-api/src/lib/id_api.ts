import { getIdApiClient, IdApiClient } from '@liquio/back-core';

// Constants.
const DEFAULT_SERVER = 'http://id-api';
const DEFAULT_PORT = 8100;
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_CLIENT_ID = 'admin-api';

/**
 * Init the shared id-api client from the `auth` config section. Call once on startup,
 * after the global log is set. Everywhere else use `getIdApiClient()` without arguments.
 * @param {object} authConfig Auth config section.
 * @returns {IdApiClient}
 */
export function initIdApiClient(authConfig: Record<string, any> = {}): IdApiClient {
  return getIdApiClient({
    server: authConfig.server || DEFAULT_SERVER,
    port: authConfig.port || DEFAULT_PORT,
    routes: authConfig.routes,
    timeout: authConfig.timeout || DEFAULT_TIMEOUT,
    clientId: authConfig.clientId || DEFAULT_CLIENT_ID,
    clientSecret: authConfig.clientSecret,
    basicAuthToken: authConfig.basicAuthToken,
    getLog: () => global.log,
  });
}
