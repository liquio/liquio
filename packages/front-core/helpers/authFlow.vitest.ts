import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requestAuth } from 'core/actions/auth';

const mocks = vi.hoisted(() => ({
  values: new Map<string, string>(),
  get: vi.fn(),
  post: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('services/api', () => ({ get: mocks.get, post: mocks.post }));
vi.mock('store', () => ({ default: { getState: () => ({}) } }));
vi.mock('core/helpers/configLoader', () => ({
  getConfig: () => ({ disableCabinetState: false }),
}));
vi.mock('helpers/storage', () => ({
  default: {
    getItem: (key: string) => mocks.values.get(key) ?? null,
    setItem: (key: string, value: string) => mocks.values.set(key, value),
    removeItem: (key: string) => mocks.values.delete(key),
  },
}));
vi.mock('helpers/setCookie', () => ({ default: vi.fn() }));
vi.mock('helpers/deleteCookie', () => ({ default: vi.fn() }));
vi.mock('actions/error', () => ({ addError: vi.fn() }));
vi.mock('@sentry/browser', () => ({
  captureException: mocks.captureException,
  configureScope: vi.fn(),
}));

beforeEach(() => {
  mocks.values.clear();
  vi.clearAllMocks();
});

describe('login contract integration', () => {
  it('rejects malformed login tokens before storing them or requesting the profile', async () => {
    mocks.post.mockResolvedValue({ token: 123 });
    const dispatch = vi.fn();
    expect(await requestAuth('code', 'state')(dispatch)).toBeInstanceOf(
      TypeError,
    );
    expect(mocks.values.has('token')).toBe(false);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'TOKEN_ERROR',
      payload: true,
    });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('stores a valid token and continues loading the profile', async () => {
    mocks.post.mockResolvedValue({ token: 'test-token' });
    const user = { userId: 'user-1' };
    mocks.get.mockResolvedValue(user);
    const dispatch = vi.fn();
    expect(await requestAuth('code', 'state')(dispatch)).toBe(user);
    expect(mocks.values.get('token')).toBe('test-token');
    expect(dispatch).toHaveBeenCalledWith({
      type: 'AUTH_SET_TOKEN',
      payload: 'test-token',
    });
    expect(mocks.get).toHaveBeenCalledWith(
      'auth/me',
      'REQUEST_USER_INFO',
      dispatch,
    );
  });
});
