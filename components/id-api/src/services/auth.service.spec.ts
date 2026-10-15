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

describe('AuthService OAuth client preparation', () => {
  const REGISTERED = 'https://app.example/cb';
  let auth: AuthService;
  let getClient: jest.Mock;

  const createRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  };

  // Runs the validators and the handler of a middleware chain; resolves to whether `next` was reached.
  async function runChain(chain: any[], req: any, res: any): Promise<boolean> {
    for (const middleware of chain) {
      let proceeded = false;
      await middleware(req, res, () => {
        proceeded = true;
      });
      if (!proceeded) return false;
    }
    return true;
  }

  const createReq = (query: Record<string, any>, session: Record<string, any> = {}, body: any = {}) => ({ query, body, session }) as any;

  beforeEach(() => {
    jest.clearAllMocks();

    getClient = jest.fn().mockResolvedValue({
      clientId: 'client',
      client_name: 'Client',
      secret: 'topsecret',
      need_secret: true,
      requirements: [],
      scope: [],
      redirectUris: [REGISTERED],
    });
    auth = new AuthService({ oauth: { defaults: { client_id: 'default', redirect_uri: ['http://default-site'] } } } as any, {} as any, {} as any);
    (auth as any).oAuth2Model = { getClient };
  });

  describe('prepareClient', () => {
    const query = { client_id: 'client', response_type: 'code', state: 'st', redirect_uri: REGISTERED };

    it('stores the client in the session without its secret', async () => {
      const req = createReq({ ...query, client_secret: 'topsecret' });
      const res = createRes();

      expect(await runChain(auth.prepareClient(), req, res)).toBe(true);

      expect(getClient).toHaveBeenCalledWith('client', null);
      expect(req.session).toMatchObject({ client_id: 'client', redirect_uri: REGISTERED, response_type: 'code', state: 'st' });
      expect(JSON.stringify(req.session)).not.toContain('topsecret');
      expect(JSON.stringify(mockLog.save.mock.calls)).not.toContain('topsecret');
    });

    it('rejects an unknown client', async () => {
      getClient.mockResolvedValue(false);
      const req = createReq(query);
      const res = createRes();

      expect(await runChain(auth.prepareClient(), req, res)).toBe(false);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(req.session.client_id).toBeUndefined();
    });

    it.each(['token', 'id_token', 'code token'])('rejects response_type=%p', async (responseType) => {
      const req = createReq({ ...query, response_type: responseType });
      const res = createRes();

      expect(await runChain(auth.prepareClient(), req, res)).toBe(false);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'unsupported_response_type' }));
      expect(getClient).not.toHaveBeenCalled();
    });

    it('defaults response_type to code', async () => {
      const req = createReq({ client_id: 'client', state: 'st', redirect_uri: REGISTERED });

      expect(await runChain(auth.prepareClient(), req, createRes())).toBe(true);
      expect(req.session.response_type).toBe('code');
    });

    it.each([
      'https://attacker.example/cb',
      'https://app.example/cb/',
      'https://app.example/cb?x=1',
      'https://app.example/CB',
      'https://app.example.attacker.example/cb',
    ])('rejects the unregistered redirect_uri %p', async (redirectUri) => {
      const req = createReq({ ...query, redirect_uri: redirectUri });
      const res = createRes();

      expect(await runChain(auth.prepareClient(), req, res)).toBe(false);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(req.session.redirect_uri).toBeUndefined();
    });

    it('stores the PKCE challenge in the session', async () => {
      const req = createReq({ ...query, code_challenge: 'a'.repeat(43), code_challenge_method: 'S256' });

      expect(await runChain(auth.prepareClient(), req, createRes())).toBe(true);
      expect(req.session).toMatchObject({ code_challenge: 'a'.repeat(43), code_challenge_method: 'S256' });
    });

    it('clears a previous PKCE binding when the new authorization has none', async () => {
      const req = createReq(query, { code_challenge: 'b'.repeat(43), code_challenge_method: 'S256' });

      expect(await runChain(auth.prepareClient(), req, createRes())).toBe(true);
      expect(req.session.code_challenge).toBeUndefined();
      expect(req.session.code_challenge_method).toBeUndefined();
    });

    it.each([
      { code_challenge: 'a'.repeat(43) },
      { code_challenge_method: 'S256' },
      { code_challenge: 'a'.repeat(43), code_challenge_method: 'plain' },
      { code_challenge: 'short', code_challenge_method: 'S256' },
      { code_challenge: ['a', 'b'], code_challenge_method: 'S256' },
    ])('rejects incomplete or unsupported PKCE parameters %p', async (extra) => {
      const req = createReq({ ...query, ...extra });
      const res = createRes();

      expect(await runChain(auth.prepareClient(), req, res)).toBe(false);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(getClient).not.toHaveBeenCalled();
      expect(req.session.code_challenge).toBeUndefined();
    });

    it('rejects a client that has no registered redirect URIs', async () => {
      getClient.mockResolvedValue({ clientId: 'client', redirectUris: [], requirements: [] });
      const req = createReq({ client_id: 'client', state: 'st', redirect_uri: REGISTERED });
      const res = createRes();

      expect(await runChain(auth.prepareClient(), req, res)).toBe(false);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('readyClient', () => {
    it('passes the session PKCE binding and ignores PKCE parameters of the request', async () => {
      const session = { client_id: 'client', redirect_uri: REGISTERED, code_challenge: 'a'.repeat(43), code_challenge_method: 'S256' };
      const req = createReq({}, session, { code_challenge: 'b'.repeat(43), code_challenge_method: 'plain' });

      expect(await runChain(auth.readyClient(), req, createRes())).toBe(true);

      expect(req.body).toMatchObject({ code_challenge: 'a'.repeat(43), code_challenge_method: 'S256' });
    });

    it('does not pass PKCE parameters of the request when the session has none', async () => {
      const req = createReq({}, { client_id: 'client', redirect_uri: REGISTERED }, { code_challenge: 'b'.repeat(43), code_challenge_method: 'S256' });

      expect(await runChain(auth.readyClient(), req, createRes())).toBe(true);

      expect(req.body.code_challenge).toBeUndefined();
      expect(req.body.code_challenge_method).toBeUndefined();
    });

    it('takes the destination from the session and ignores the request query', async () => {
      const req = createReq(
        { redirect_uri: 'https://attacker.example/' },
        { client_id: 'client', redirect_uri: REGISTERED, client: { clientId: 'client', requirements: [], redirectUri: [REGISTERED] } },
        { redirect_uri: 'https://attacker.example/' },
      );

      expect(await runChain(auth.readyClient(), req, createRes())).toBe(true);

      expect(req.body.redirect_uri).toBe(REGISTERED);
      expect(req.body.client_secret).toBeUndefined();
    });

    it('uses the configured defaults when there is no client session', async () => {
      const req = createReq({ redirect_uri: 'https://attacker.example/' });

      expect(await runChain(auth.readyClient(), req, createRes())).toBe(true);

      expect(req.body).toMatchObject({ client_id: 'default', redirect_uri: 'http://default-site' });
    });

    it('fails closed when the session redirect_uri is not registered for the session client', async () => {
      const req = createReq(
        {},
        {
          client_id: 'client',
          redirect_uri: 'https://attacker.example/',
          client: { clientId: 'client', requirements: [], redirectUri: [REGISTERED] },
        },
      );
      const res = createRes();

      expect(await runChain(auth.readyClient(), req, res)).toBe(false);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('fails closed when no redirect_uri can be resolved', async () => {
      auth = new AuthService({ oauth: { defaults: { client_id: 'default', redirect_uri: [] } } } as any, {} as any, {} as any);
      const req = createReq({ redirect_uri: 'https://attacker.example/' });
      const res = createRes();

      expect(await runChain(auth.readyClient(), req, res)).toBe(false);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('does not log secrets', async () => {
      const req = createReq({}, { client_id: 'client' }, { client_secret: 'topsecret' });

      await runChain(auth.readyClient(), req, createRes());

      expect(JSON.stringify(mockLog.save.mock.calls)).not.toContain('topsecret');
    });
  });
});
