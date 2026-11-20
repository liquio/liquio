import http from 'http';
import { AddressInfo } from 'net';

import { WebSocket } from 'ws';

import { RouterService, WS_AUTH_PROTOCOL } from './router';
import { SYSTEM_ADMIN_UNIT, SUPPORT_ADMIN_UNIT } from '../constants/unit';

const mockAuthenticateToken = jest.fn();
jest.mock('../controllers/auth', () => ({
  AuthController: jest.fn().mockImplementation(() => ({ authenticateToken: mockAuthenticateToken })),
}));

describe('RouterService WebSocket', () => {
  let server: http.Server;
  let router: RouterService;
  let url: string;

  const connect = (protocols?: string[], headers: Record<string, string> = {}) =>
    new Promise<{ ws: WebSocket; status?: number }>((resolve) => {
      const ws = new WebSocket(url, protocols, { headers });
      ws.on('open', () => resolve({ ws }));
      ws.on('unexpected-response', (_req, res) => {
        res.resume();
        resolve({ ws, status: res.statusCode });
      });
      ws.on('error', () => undefined);
    });

  beforeEach(async () => {
    mockAuthenticateToken.mockReset();
    mockAuthenticateToken.mockImplementation(async (token) => (token === 'good' ? { status: 200 } : { status: 401, error: 'Unauthorized.' }));
    (RouterService as any).singleton = undefined;
    router = new RouterService({ auth: { clientId: 'c' }, server: {} });
    server = http.createServer();
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    router.server = server;
    router.initWebSocket();
    url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/ws/ws`;
  });

  afterEach(async () => {
    router.wss.clients.forEach((c) => c.terminate());
    await new Promise((r) => router.wss.close(r));
    await new Promise((r) => server.close(r));
  });

  it('should refuse connection without a token', async () => {
    expect((await connect()).status).toBe(401);
  });

  it('should refuse connection with an invalid token', async () => {
    expect((await connect([WS_AUTH_PROTOCOL, 'bad'])).status).toBe(401);
  });

  it('should refuse a token passed in the URL query', async () => {
    url += '?token=good';
    expect((await connect()).status).toBe(401);
  });

  it('should refuse a non-admin user', async () => {
    mockAuthenticateToken.mockResolvedValue({ status: 403, error: 'Access denied.' });
    expect((await connect([WS_AUTH_PROTOCOL, 'good'])).status).toBe(403);
  });

  it('should require admin roles and system/support units', async () => {
    const { ws } = await connect([WS_AUTH_PROTOCOL, 'good']);
    ws.close();
    expect(mockAuthenticateToken).toHaveBeenCalledWith('good', ['admin', 'admin-c'], [SYSTEM_ADMIN_UNIT, SUPPORT_ADMIN_UNIT]);
  });

  it('should refuse a disallowed Origin', async () => {
    router.config.server.allowedOrigins = ['https://admin.example'];
    await new Promise((r) => router.wss.close(r));
    router.initWebSocket();
    expect((await connect([WS_AUTH_PROTOCOL, 'good'], { Origin: 'https://evil.example' })).status).toBe(403);
  });

  it('should accept a valid admin without echoing the token', async () => {
    const { ws, status } = await connect([WS_AUTH_PROTOCOL, 'good']);
    expect(status).toBeUndefined();
    expect(ws.protocol).toBe(WS_AUTH_PROTOCOL);
    ws.close();
  });

  it('should not deliver a message from one client to another', async () => {
    const a = (await connect([WS_AUTH_PROTOCOL, 'good'])).ws;
    const b = (await connect([WS_AUTH_PROTOCOL, 'good'])).ws;
    const received: string[] = [];
    b.on('message', (m) => received.push(m.toString()));
    a.send(JSON.stringify({ hello: 'world' }));
    await new Promise((r) => setTimeout(r, 200));
    expect(received.filter((m) => m !== 'user connected')).toEqual([]);
    a.close();
    b.close();
  });
});
