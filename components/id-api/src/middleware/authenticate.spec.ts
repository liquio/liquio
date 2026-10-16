const mockOidcLogout = jest.fn();
const mockMatchedData = jest.fn();
jest.mock('express-validator', () => ({
  ...jest.requireActual('express-validator'),
  matchedData: (...args: unknown[]) => mockMatchedData(...args),
}));

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

import { Models } from '../models';
import { Services } from '../services';
import { prepareLoginHistoryData } from '../lib/login_history_extractor';
import { AuthMiddleware } from './authenticate';

const USER_ID = 'a'.repeat(24);

// The logout route is registered as (path, ...guards, handler): pick the handler.
const lastArg = (route: jest.Mock) => route.mock.calls[0][route.mock.calls[0].length - 1];

describe('AuthMiddleware logout', () => {
  let calls: string[];
  let auth: any;
  let res: any;

  const createHandler = () => {
    const express: any = {
      config: { oauth: { secret_key: [Buffer.from('user:pass').toString('base64')] }, domain: '.liquio.local' },
      get: jest.fn(),
      post: jest.fn(),
    };
    new AuthMiddleware(express);
    return lastArg(express.get) as (req: any, res: any) => Promise<void>;
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
    expect(res.clearCookie).toHaveBeenCalledWith('jwt', expect.objectContaining({ domain: '.liquio.local', sameSite: 'lax' }));
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

describe('AuthMiddleware logout redirect', () => {
  const REGISTERED = 'https://app.example/auth';
  let res: any;

  const logoutWith = async (redirectUri: string | undefined, endSessionUrl?: string) => {
    const express: any = { config: { oauth: { secret_key: [Buffer.from('user:pass').toString('base64')] } }, get: jest.fn(), post: jest.fn() };
    new AuthMiddleware(express);
    const handler = lastArg(express.get);
    mockMatchedData.mockReturnValue({ redirect_uri: redirectUri });
    mockOidcLogout.mockResolvedValue({ endSessionUrl });
    const req: any = {
      session: { passport: { user: { userId: USER_ID, provider: endSessionUrl ? 'oidc-dex' : 'local' } } },
      query: redirectUri === undefined ? {} : { redirect_uri: redirectUri },
      protocol: 'https',
      get: () => 'id.example',
      logout: (cb: () => void) => cb(),
    };
    await handler(req, res);
    // onLogout runs inside the logout callback and is not awaited by the handler.
    await new Promise((resolve) => setImmediate(resolve));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete (AuthMiddleware as any).singleton;
    (Services.service as jest.Mock).mockReturnValue({ revokeUserAccess: jest.fn() });
    (Models.model as jest.Mock).mockReturnValue({
      findAll: jest.fn(async () => [{ dataValues: { redirectUri: [REGISTERED] } }]),
    });
    res = { clearCookie: jest.fn(), redirect: jest.fn() };
  });

  it.each([
    ['an exact registered redirect URI', REGISTERED, REGISTERED],
    ['a local path', '/profile?tab=1', '/profile?tab=1'],
    ['an absent redirect', undefined, '/'],
    ['an attacker origin', 'https://evil.example/', '/'],
    ['a prefix lookalike host', `${REGISTERED}.evil.example`, '/'],
    ['a registered URI used as a prefix', `${REGISTERED}/../x`, '/'],
    ['a userinfo lookalike', 'https://app.example@evil.example/auth', '/'],
    ['a protocol-relative URL', '//evil.example', '/'],
    ['a backslash protocol-relative URL', '/\\evil.example', '/'],
    ['an encoded protocol-relative URL', '%2F%2Fevil.example', '/'],
    ['a javascript URL', 'javascript:alert(1)', '/'],
  ])('redirects %s', async (_name, input, expected) => {
    await logoutWith(input as string | undefined);

    expect(res.redirect).toHaveBeenCalledWith(expected);
  });

  it('passes only a validated redirect to the IdP end_session_endpoint', async () => {
    await logoutWith('https://evil.example/', 'https://idp.example/logout');

    const url = new URL(res.redirect.mock.calls[0][0]);
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe('https://id.example/');
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
      post: jest.fn(),
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

describe('AuthMiddleware logout CSRF guards (ID-19)', () => {
  const REGISTERED = 'https://app.example/auth';
  let getGuard: any;
  let postGuard: any;
  let auth: any;
  let res: any;
  let next: jest.Mock;

  const request = (headers: Record<string, string>, extra: Record<string, any> = {}) =>
    ({
      session: {} as Record<string, any>,
      query: {},
      body: {},
      get: (name: string) => headers[name.toLowerCase()],
      ...extra,
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    delete (AuthMiddleware as any).singleton;
    auth = { revokeUserAccess: jest.fn() };
    (Services.service as jest.Mock).mockReturnValue(auth);
    (Models.model as jest.Mock).mockReturnValue({ findAll: jest.fn(async () => [{ dataValues: { redirectUri: [REGISTERED] } }]) });
    const express: any = {
      config: { oauth: { secret_key: [Buffer.from('user:pass').toString('base64')] }, domain: '.liquio.local' },
      get: jest.fn(),
      post: jest.fn(),
    };
    new AuthMiddleware(express);
    getGuard = express.get.mock.calls[0][1];
    postGuard = express.post.mock.calls[0][1];
    res = { set: jest.fn(), status: jest.fn().mockReturnThis(), type: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn() };
    next = jest.fn();
  });

  it.each(['same-origin', 'same-site', 'none'])('lets a GET with Sec-Fetch-Site %s through to the revoking handler', async (site) => {
    await getGuard(request({ host: 'id.liquio.local', 'sec-fetch-site': site }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.send).not.toHaveBeenCalled();
  });

  it.each([
    ['cross-site Sec-Fetch-Site', { 'sec-fetch-site': 'cross-site' }],
    ['a foreign Origin without Sec-Fetch-Site', { origin: 'https://evil.example' }],
    ['a foreign Referer without Sec-Fetch-Site', { referer: 'https://evil.example/page' }],
    ['a null Origin', { origin: 'null' }],
    ['no proof at all', {}],
  ])('does not revoke on a GET with %s, renders a confirmation with a CSRF token', async (_name, headers) => {
    const req = request({ host: 'id.liquio.local', ...headers }, { query: { redirect_uri: 'https://a/?x="<' } });

    await getGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(auth.revokeUserAccess).not.toHaveBeenCalled();
    const html = res.send.mock.calls[0][0] as string;
    expect(html).toContain(`value="${req.session.logoutCsrfToken}"`);
    expect(html).toContain('method="post"');
    expect(html).not.toContain('<"');
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ 'X-Frame-Options': 'DENY' }));
  });

  it.each([
    ['the Origin of a registered redirect URI', { origin: 'https://app.example' }],
    ['the Referer of a registered redirect URI', { referer: 'https://app.example/page' }],
    ['a subdomain of the configured domain', { origin: 'https://cabinet.liquio.local' }],
    ['the own host', { origin: 'https://id.liquio.local' }],
  ])('lets a GET through by %s when Sec-Fetch-Site is absent', async (_name, headers) => {
    await getGuard(request({ host: 'id.liquio.local', ...headers }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects a lookalike host of the configured domain', async () => {
    await getGuard(request({ host: 'id.liquio.local', origin: 'https://liquio.local.evil.example' }), res, next);

    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a POST with the session CSRF token', async () => {
    const req = request({ 'sec-fetch-site': 'cross-site' }, { session: { logoutCsrfToken: 'tok-123' }, body: { _csrf: 'tok-123' } });

    await postGuard(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['an invalid token', { 'sec-fetch-site': 'same-origin' }, { _csrf: 'wrong' }, { logoutCsrfToken: 'tok-123' }],
    ['a token with no session token', { 'sec-fetch-site': 'same-origin' }, { _csrf: 'tok-123' }, {}],
    ['no token from a cross-site request', { 'sec-fetch-site': 'cross-site' }, {}, { logoutCsrfToken: 'tok-123' }],
    ['no token and no proof', {}, {}, {}],
  ])('rejects a POST with %s', async (_name, headers, body, session) => {
    await postGuard(request(headers, { body, session }), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('accepts a tokenless POST from a verified same-site request', async () => {
    await postGuard(request({ 'sec-fetch-site': 'same-origin' }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
