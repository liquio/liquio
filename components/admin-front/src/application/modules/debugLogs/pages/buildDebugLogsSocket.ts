// Marker subprotocol the admin-api WebSocket handshake expects, followed by the session token.
export const WS_AUTH_PROTOCOL = 'liquio-admin-ws';

const toWsScheme = (backendUrl: string): string => backendUrl.replace(/^http(s?):/i, (_match, secure: string) => `ws${secure}:`);

/**
 * Opens the debug logs WebSocket. The token is sent in the Sec-WebSocket-Protocol header
 * (never in the URL, to keep it out of access logs, history and Referer).
 */
const buildDebugLogsSocket = (backendUrl: string, token: string): WebSocket =>
  new WebSocket(`${toWsScheme(backendUrl)}/ws/ws`, [WS_AUTH_PROTOCOL, token]);

export default buildDebugLogsSocket;
