import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestSignData } from './eds';

const { api, dispatch } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
  dispatch: vi.fn(),
}));

vi.mock('services/api', () => api);
vi.mock('store', () => ({ default: { dispatch } }));

describe('actions/eds', () => {
  beforeEach(() => {
    api.get.mockReset().mockResolvedValue('result');
    api.post.mockReset().mockResolvedValue('result');
  });

  it('requestSignData requests the data to sign', async () => {
    expect(await requestSignData()).toBe('result');
    expect(api.get).toHaveBeenCalledWith('authorise/eds/sign', 'REQUEST_SIGN_DATA', dispatch);
  });
});
