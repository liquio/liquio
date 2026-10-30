import { getIdApiClient, IdApiClient } from '@liquio/back-core';

/**
 * Init the shared id-api client from the `auth_server` config section. Call once on startup, before anything uses
 * the client. Everywhere else use `getIdApiClient()` without arguments.
 * @param {object} authServerConfig Id-api config section (`conf.auth_server`).
 * @returns {IdApiClient}
 */
export function initIdApiClient(authServerConfig: Record<string, any> = {}): IdApiClient {
  return getIdApiClient({
    // The host is a full URL that may already contain the port, so no port is appended unless the config has one.
    server: authServerConfig.host,
    port: authServerConfig.port,
    timeout: authServerConfig.timeout,
    basicAuthToken: authServerConfig.basicAuthToken,
    basicAuthUser: authServerConfig.user,
    basicAuthPassword: authServerConfig.password,
    getLog: () => global.log,
  });
}
