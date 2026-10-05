const mockLog = { save: jest.fn() };
const mockServices: Record<string, any> = {};
const mockModels: Record<string, any> = {};

jest.mock('./base_service', () => ({
  BaseService: class MockBaseService {
    config: any;
    log = mockLog;
    constructor(config: any) {
      this.config = config;
    }
    service(name: string) {
      return mockServices[name];
    }
    model(name: string) {
      return mockModels[name];
    }
  },
}));
jest.mock('../lib/oauth_model', () => ({ OAuthModel: class MockOAuthModel {} }));
jest.mock('../middleware/session', () => ({ saveSession: jest.fn() }));
jest.mock('../models', () => ({ Models: { model: jest.fn() } }));
jest.mock('@node-oauth/oauth2-server', () => {
  class MockOAuth2Server {}
  return { __esModule: true, default: MockOAuth2Server, InvalidClientError: Error, OAuthError: Error, Request: class {}, Response: class {} };
});

import { createHash } from 'crypto';

import { AuthService, getTaskTokenCacheKey } from './auth.service';

const USER_ID = 'a'.repeat(24);

describe('getTaskTokenCacheKey', () => {
  it('is token.<sha256 hex of the access token>, as task reads it', () => {
    // Task: `token.${sha256(authTokens.accessToken)}` through a plain string key (no redis prefix is applied).
    expect(getTaskTokenCacheKey('abc')).toBe('token.ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('matches the sha256 hex digest of the token for arbitrary tokens', () => {
    const accessToken = 'f3c1d0a2b4e5';

    expect(getTaskTokenCacheKey(accessToken)).toBe(`token.${createHash('sha256').update(accessToken).digest('hex')}`);
  });
});

describe('AuthService access revocation', () => {
  let auth: AuthService;
  let redis: any;
  let accessToken: any;
  let refreshToken: any;
  let sessions: any;

  beforeEach(() => {
    jest.clearAllMocks();

    redis = { isEnabled: true, delete: jest.fn().mockResolvedValue(1) };
    accessToken = {
      findAll: jest.fn().mockResolvedValue([{ dataValues: { accessToken: 'abc' } }, { dataValues: { accessToken: 'def' } }]),
      destroy: jest.fn().mockResolvedValue(2),
    };
    refreshToken = { destroy: jest.fn().mockResolvedValue(1) };
    sessions = { destroy: jest.fn().mockResolvedValue(3) };

    mockServices.redis = redis;
    mockModels.accessToken = accessToken;
    mockModels.refreshToken = refreshToken;
    mockModels.sessions = sessions;

    auth = new AuthService({ oauth: {} } as any, {} as any, {} as any);
  });

  describe('invalidateUserTokenCache', () => {
    it('deletes the task cache key of every access token of the user', async () => {
      const count = await auth.invalidateUserTokenCache(USER_ID);

      expect(count).toBe(2);
      expect(accessToken.findAll).toHaveBeenCalledWith({ where: { userId: USER_ID } });
      expect(redis.delete).toHaveBeenCalledWith('token.ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
      expect(redis.delete).toHaveBeenCalledWith(`token.${createHash('sha256').update('def').digest('hex')}`);
    });

    it('deletes plain string keys, so that no redis prefix is applied', async () => {
      await auth.invalidateUserTokenCache(USER_ID);

      for (const [key] of redis.delete.mock.calls) {
        expect(typeof key).toBe('string');
      }
    });

    it('does not destroy tokens, refresh tokens or sessions', async () => {
      await auth.invalidateUserTokenCache(USER_ID);

      expect(accessToken.destroy).not.toHaveBeenCalled();
      expect(refreshToken.destroy).not.toHaveBeenCalled();
      expect(sessions.destroy).not.toHaveBeenCalled();
    });

    it('does nothing when redis is disabled', async () => {
      redis.isEnabled = false;

      expect(await auth.invalidateUserTokenCache(USER_ID)).toBe(0);

      expect(accessToken.findAll).not.toHaveBeenCalled();
      expect(redis.delete).not.toHaveBeenCalled();
    });

    it('throws a redis error', async () => {
      redis.delete.mockRejectedValue(new Error('redis down'));

      await expect(auth.invalidateUserTokenCache(USER_ID)).rejects.toThrow('redis down');
    });

    it('logs and goes on with a redis error when asked to ignore it', async () => {
      redis.delete.mockRejectedValue(new Error('redis down'));

      await expect(auth.invalidateUserTokenCache(USER_ID, { ignoreCacheErrors: true })).resolves.toBe(2);

      expect(redis.delete).toHaveBeenCalledTimes(2);
      expect(mockLog.save).toHaveBeenCalledWith('delete-user-info-cache-error', expect.objectContaining({ userId: USER_ID }), 'error');
    });
  });

  describe('invalidateUserCache', () => {
    it("deletes id-api's own cached user by userId", async () => {
      await auth.invalidateUserCache(USER_ID);

      expect(redis.delete).toHaveBeenCalledWith(['oauthmodel', 'getUser', { userId: USER_ID }]);
    });
  });

  describe('revokeUserAccess', () => {
    it('deletes access tokens, refresh tokens and sessions of the user and reports the counts', async () => {
      const result = await auth.revokeUserAccess(USER_ID);

      expect(result).toEqual({ accessTokens: 2, refreshTokens: 1, sessions: 3 });
      expect(accessToken.destroy).toHaveBeenCalledWith({ where: { userId: USER_ID } });
      expect(refreshToken.destroy).toHaveBeenCalledWith({ where: { userId: USER_ID } });
      expect(sessions.destroy).toHaveBeenCalledWith({ where: { userId: USER_ID } });
    });

    it('deletes the task cache keys before the tokens they come from', async () => {
      const order: string[] = [];
      redis.delete.mockImplementation(async () => order.push('cache'));
      accessToken.destroy.mockImplementation(async () => order.push('tokens'));

      await auth.revokeUserAccess(USER_ID);

      expect(order).toEqual(['cache', 'cache', 'tokens']);
    });

    it('deletes nothing when the cache cannot be cleared, so that it can be repeated', async () => {
      redis.delete.mockRejectedValue(new Error('redis down'));

      await expect(auth.revokeUserAccess(USER_ID)).rejects.toThrow('redis down');

      expect(accessToken.destroy).not.toHaveBeenCalled();
      expect(refreshToken.destroy).not.toHaveBeenCalled();
      expect(sessions.destroy).not.toHaveBeenCalled();
    });

    it('still deletes the tokens when the cache errors are ignored', async () => {
      redis.delete.mockRejectedValue(new Error('redis down'));

      await expect(auth.revokeUserAccess(USER_ID, { ignoreCacheErrors: true })).resolves.toEqual({ accessTokens: 2, refreshTokens: 1, sessions: 3 });
    });

    it('works without redis', async () => {
      redis.isEnabled = false;

      await auth.revokeUserAccess(USER_ID);

      expect(redis.delete).not.toHaveBeenCalled();
      expect(sessions.destroy).toHaveBeenCalled();
    });
  });
});
