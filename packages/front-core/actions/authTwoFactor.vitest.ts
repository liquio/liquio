import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api, dispatch } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
  dispatch: vi.fn(),
}));

vi.mock('services/api', () => ({ default: api, ...api }));
vi.mock('store', () => ({ default: { dispatch: vi.fn() } }));
vi.mock('helpers/storage', () => ({ default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() } }));

import { setAuthMode } from './auth';

describe('setAuthMode', () => {
  beforeEach(() => {
    api.get.mockReset().mockResolvedValue({ useTwoFactorAuth: false, twoFactorType: null });
    api.post.mockReset().mockResolvedValue({ isAccepted: true });
  });

  it('posts the mode with the code and refreshes the stored auth mode', async () => {
    await setAuthMode({ useTwoFactorAuth: false, code: '123456' })(dispatch);
    expect(api.post).toHaveBeenCalledWith(
      expect.stringContaining('two_factor_auth'),
      { useTwoFactorAuth: false, code: '123456' },
      'SET_AUTH_MODE',
      dispatch,
    );
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('two_factor_auth'), 'REQUEST_AUTH_MODE', dispatch);
  });

  it('rejects with the server error and does not refresh', async () => {
    api.post.mockRejectedValue(new Error('Confirmation code is invalid.'));
    await expect(setAuthMode({ useTwoFactorAuth: false, code: '0' })(dispatch)).rejects.toThrow(
      'Confirmation code is invalid.',
    );
    expect(api.get).not.toHaveBeenCalled();
  });
});
