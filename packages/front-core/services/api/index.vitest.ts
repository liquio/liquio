import { beforeEach, describe, expect, it, vi } from 'vitest';

import { get } from 'services/api';

const mocks = vi.hoisted(() => ({ values: new Map<string, string>() }));

vi.mock('actions/auth', () => ({ logout: vi.fn(() => ({ type: 'LOGOUT' })), AUTH_SET_TOKEN: 'AUTH_SET_TOKEN' }));
vi.mock('actions/error', () => ({ showServiceMessage: vi.fn() }));
vi.mock('core/helpers/configLoader', () => ({ getConfig: () => ({ backendUrl: 'http://api' }) }));
vi.mock('@sentry/browser', () => ({ withScope: vi.fn(), captureException: vi.fn() }));
vi.mock('helpers/storage', () => ({
  default: {
    getItem: (key: string) => mocks.values.get(key) ?? null,
    setItem: (key: string, value: string) => mocks.values.set(key, value),
    removeItem: (key: string) => mocks.values.delete(key),
  },
}));

const respond = (status: number, headers: Record<string, string> = {}) =>
  vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: { ok: true } }), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    }),
  );

beforeEach(() => {
  mocks.values.clear();
  mocks.values.set('token', 'old');
  vi.stubGlobal('fetch', respond(200));
});

describe('api sliding session token', () => {
  it('stores new_token from a response and dispatches AUTH_SET_TOKEN', async () => {
    vi.stubGlobal('fetch', respond(200, { new_token: 'renewed' }));
    const dispatch = vi.fn();
    await get('x', 'ACTION', dispatch);
    expect(mocks.values.get('token')).toBe('renewed');
    expect(dispatch).toHaveBeenCalledWith({ type: 'AUTH_SET_TOKEN', payload: 'renewed' });
  });

  it('leaves the token unchanged when the response has no new_token', async () => {
    const dispatch = vi.fn();
    await get('x', 'ACTION', dispatch);
    expect(mocks.values.get('token')).toBe('old');
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'AUTH_SET_TOKEN' }));
  });

  it('ignores new_token on a failed response', async () => {
    vi.stubGlobal('fetch', respond(500, { new_token: 'renewed' }));
    await get('x', 'ACTION', vi.fn()).catch(() => undefined);
    expect(mocks.values.get('token')).toBe('old');
  });

  it('sends the renewed token on the next request', async () => {
    const first = respond(200, { new_token: 'renewed' });
    vi.stubGlobal('fetch', first);
    await get('x', 'ACTION', vi.fn());
    const second = respond(200);
    vi.stubGlobal('fetch', second);
    await get('y', 'ACTION', vi.fn());
    expect(second.mock.calls[0][1].headers.token).toBe('renewed');
  });
});
