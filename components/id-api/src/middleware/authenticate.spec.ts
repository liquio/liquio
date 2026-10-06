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
