import { describe, it, expect, vi } from 'vitest';

import buildDebugLogsSocket from './buildDebugLogsSocket';

describe('buildDebugLogsSocket', () => {
  const setup = () => {
    const ctor = vi.fn();
    vi.stubGlobal('WebSocket', function WebSocketMock(this: unknown, ...args: unknown[]) {
      ctor(...args);
    });
    return ctor;
  };

  it('sends the token as a subprotocol and never in the URL', () => {
    const ctor = setup();

    buildDebugLogsSocket('https://admin.example.com', 'secret-token');

    const [url, protocols] = ctor.mock.calls[0];
    expect(url).not.toContain('token=');
    expect(url).not.toContain('secret-token');
    expect(protocols).toEqual(['liquio-admin-ws', 'secret-token']);
  });

  it('maps https to wss', () => {
    const ctor = setup();
    buildDebugLogsSocket('https://admin.example.com', 't');
    expect(ctor.mock.calls[0][0]).toBe('wss://admin.example.com/ws/ws');
  });

  it('maps http to ws', () => {
    const ctor = setup();
    buildDebugLogsSocket('http://localhost:3000', 't');
    expect(ctor.mock.calls[0][0]).toBe('ws://localhost:3000/ws/ws');
  });
});
