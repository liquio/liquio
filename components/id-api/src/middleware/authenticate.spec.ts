const mockOidcLogout = jest.fn();

jest.mock('../strategies/govid', () => ({ govid: jest.fn(), logout: jest.fn() }));
jest.mock('../strategies/ldap', () => ({ ldap: jest.fn(), logout: jest.fn() }));
jest.mock('../strategies/local', () => ({ local: jest.fn(), logout: jest.fn() }));
jest.mock('../strategies/oidc', () => ({ oidc: jest.fn(), logout: (...args: unknown[]) => mockOidcLogout(...args) }));
jest.mock('../strategies/wso2', () => ({ wso2: jest.fn(), logout: jest.fn() }));
jest.mock('../strategies/x509', () => ({ x509: jest.fn(), logout: jest.fn() }));
jest.mock('./session', () => ({ destroySession: jest.fn(), saveSession: jest.fn() }));
jest.mock('../models', () => ({ Models: { model: jest.fn() } }));
jest.mock('../services', () => ({ Services: { service: jest.fn() } }));
jest.mock('../lib/login_history_extractor', () => ({ prepareLoginHistoryData: jest.fn() }));
jest.mock('@liquio/back-core', () => {
  const instance = { save: jest.fn() };
  return { Log: { getInstance: () => instance }, appendTraceMeta: jest.fn() };
});

import { Services } from '../services';
import { prepareLoginHistoryData } from '../lib/login_history_extractor';
import { AuthMiddleware } from './authenticate';

const USER_ID = 'a'.repeat(24);

describe('AuthMiddleware logout', () => {
  let calls: string[];
  let auth: any;
  let res: any;

  const createHandler = () => {
    const express: any = {
      config: { oauth: { secret_key: [Buffer.from('user:pass').toString('base64')] }, domain: '.liquio.local' },
      get: jest.fn(),
    };
    new AuthMiddleware(express);
    return express.get.mock.calls[0][2] as (req: any, res: any) => Promise<void>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete (AuthMiddleware as any).singleton;

    calls = [];
    auth = { revokeUserAccess: jest.fn(async () => calls.push('revoke')) };
    (Services.service as jest.Mock).mockImplementation((name: string) => (name === 'auth' ? auth : undefined));
    mockOidcLogout.mockImplementation(async () => {
      calls.push('strategy-logout');
      return { endSessionUrl: 'https://idp.example/logout' };
    });
    res = { clearCookie: jest.fn() };
  });

  it('revokes the access of the logged out user', async () => {
    const req = { session: { passport: { user: { userId: USER_ID, provider: 'local' } } }, logout: jest.fn() };

    await createHandler()(req, res);

    expect(auth.revokeUserAccess).toHaveBeenCalledWith(USER_ID, { ignoreCacheErrors: true });
    expect(res.clearCookie).toHaveBeenCalledWith('jwt', { domain: '.liquio.local' });
    expect(req.logout).toHaveBeenCalledTimes(1);
  });

  it('lets the strategy read the session before the sessions are destroyed', async () => {
    const req = { session: { passport: { user: { userId: USER_ID, provider: 'oidc-dex' } } }, logout: jest.fn() };

    await createHandler()(req, res);

    expect(mockOidcLogout).toHaveBeenCalledWith(req);
    expect(calls).toEqual(['strategy-logout', 'revoke']);
  });

  it('still revokes the access when the strategy logout fails', async () => {
    mockOidcLogout.mockRejectedValue(new Error('idp is down'));
    const req = { session: { passport: { user: { userId: USER_ID, provider: 'oidc-dex' } } }, logout: jest.fn() };

    await createHandler()(req, res);

    expect(auth.revokeUserAccess).toHaveBeenCalledTimes(1);
    expect(req.logout).toHaveBeenCalledTimes(1);
  });

  it('revokes nothing without a logged in user', async () => {
    const req = { session: {}, logout: jest.fn() };

    await createHandler()(req, res);

    expect(auth.revokeUserAccess).not.toHaveBeenCalled();
    expect(req.logout).toHaveBeenCalledTimes(1);
  });
});

describe('AuthMiddleware checkUserAccess', () => {
  let auth: any;
  let authService: any;
  let res: any;
  let next: jest.Mock;

  const create = (config: Record<string, any> = {}) => {
    delete (AuthMiddleware as any).singleton;
    const express: any = {
      config: { oauth: { secret_key: [Buffer.from('user:pass').toString('base64')] }, ...config },
      get: jest.fn(),
    };
    return new AuthMiddleware(express);
  };

  const sessionReq = (user: Record<string, any> | null = { userId: USER_ID, isActive: true }) =>
    ({ session: { passport: user ? { user } : undefined } }) as any;
  const run = async (req: any, options?: { requireUser?: boolean }) => {
    await auth.checkUserAccess(options)(req, res, next);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authService = { getUser: jest.fn(), destroySession: jest.fn() };
    (Services.service as jest.Mock).mockImplementation((name: string) => (name === 'auth' ? authService : undefined));
    (prepareLoginHistoryData as jest.Mock).mockReturnValue({ actionType: 'login' });
    res = { status: jest.fn().mockReturnThis(), send: jest.fn(), redirect: jest.fn() };
    next = jest.fn();
    auth = create();
  });

  const denied = (status: number) => {
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(status);
  };

  it('allows an active user', async () => {
    authService.getUser.mockResolvedValue({ userId: USER_ID, isActive: true });

    await run(sessionReq(), { requireUser: true });

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('denies a user blocked after the session was established, using the current data', async () => {
    authService.getUser.mockResolvedValue({ userId: USER_ID, isActive: false });

    await run(sessionReq({ userId: USER_ID, isActive: true }), { requireUser: true });

    denied(403);
    expect(authService.destroySession).toHaveBeenCalledWith(USER_ID, { actionType: 'login' });
  });

  it('uses the current identification type, not the session one', async () => {
    auth = create({ allowIdentificationTypes: ['eds'] });
    authService.getUser.mockResolvedValue({ userId: USER_ID, isActive: true, userIdentificationType: 'bankid' });

    await run(sessionReq({ userId: USER_ID, isActive: true, userIdentificationType: 'eds' }), { requireUser: true });

    denied(403);
  });

  it('fails closed on a missing session user with requireUser', async () => {
    await run(sessionReq(null), { requireUser: true });

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/');
    expect(authService.getUser).not.toHaveBeenCalled();
  });

  it('keeps passing unauthenticated requests without requireUser', async () => {
    await run(sessionReq(null));

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the user no longer exists', async () => {
    authService.getUser.mockRejectedValue(new Error('user not found'));

    await run(sessionReq(), { requireUser: true });

    denied(401);
  });

  it('fails closed when the policy lookup fails', async () => {
    authService.getUser.mockRejectedValue(new Error('db down'));

    await run(sessionReq(), { requireUser: true });

    denied(503);
  });

  describe('EDRPOU/RNOKPP whitelists', () => {
    const user = (overrides: Record<string, any>) => ({ userId: USER_ID, isActive: true, userIdentificationType: 'eds', ...overrides });
    const check = async (config: Record<string, any>, overrides: Record<string, any>) => {
      auth = create(config);
      authService.getUser.mockResolvedValue(user(overrides));
      await run(sessionReq(), { requireUser: true });
    };

    it('only allowEdrpou configured: matching passes, non-matching is denied', async () => {
      await check({ allowEdrpou: ['111'] }, { edrpou: '111', ipn: 'x' });
      expect(next).toHaveBeenCalledTimes(1);

      next.mockClear();
      await check({ allowEdrpou: ['111'] }, { edrpou: '222', ipn: 'x' });
      denied(403);
    });

    it('only allowRnokpp configured: matching passes, non-matching is denied', async () => {
      await check({ allowRnokpp: ['333'] }, { ipn: '333', edrpou: 'x' });
      expect(next).toHaveBeenCalledTimes(1);

      next.mockClear();
      await check({ allowRnokpp: ['333'] }, { ipn: '444', edrpou: 'x' });
      denied(403);
    });

    it('both configured: a mismatch of either list is denied, matching both passes', async () => {
      const config = { allowEdrpou: ['111'], allowRnokpp: ['333'] };

      await check(config, { edrpou: '111', ipn: '333' });
      expect(next).toHaveBeenCalledTimes(1);

      next.mockClear();
      await check(config, { edrpou: '111', ipn: '444' });
      denied(403);

      res.status.mockClear();
      next.mockClear();
      await check(config, { edrpou: '222', ipn: '333' });
      denied(403);
    });

    it('neither configured: no restriction', async () => {
      await check({}, { edrpou: '222', ipn: '444' });

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('users without an identification type are exempt from the whitelists', async () => {
      await check({ allowEdrpou: ['111'], allowRnokpp: ['333'] }, { userIdentificationType: undefined, edrpou: '222', ipn: '444' });

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
