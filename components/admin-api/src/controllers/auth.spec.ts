import { createIdApiClient, getIdApiClient } from '@liquio/back-core';

import { AuthController } from './auth';

jest.mock('@liquio/back-core', () => ({ ...jest.requireActual('@liquio/back-core'), getIdApiClient: jest.fn() }));
jest.mock('../businesses/unit', () => ({ UnitBusiness: jest.fn() }));
jest.mock('../lib/token', () => ({ Token: jest.fn() }));

describe('AuthController.me', () => {
  let controller: AuthController;
  let responseData: jest.SpyInstance;

  beforeEach(() => {
    (AuthController as any).singleton = undefined;
    (getIdApiClient as jest.Mock).mockReturnValue(createIdApiClient({ server: 'http://id.local', port: 8100 }));
    controller = new AuthController({ auth: { server: 'http://id.local' }, server: { token: 't' }, access: {} });
    responseData = jest.spyOn(controller, 'responseData').mockImplementation(() => undefined);
  });

  it('should not prefix an already full avatar URL again', async () => {
    const authUserInfo = { userId: 'u1', avaUrl: 'http://id.local:8100/ava/u1.png' };

    await controller.me({ authUserInfo, authUserRoles: ['admin'], authUserUnitIds: [1] }, {});

    const data = responseData.mock.calls[0][1];
    expect(data.fullAvaUrl).toBe('http://id.local:8100/ava/u1.png');
    expect(data.avaUrl).toBe('http://id.local:8100/ava/u1.png');
  });

  it('should respond with an empty avatar URL when the user has none', async () => {
    await controller.me({ authUserInfo: { userId: 'u1', avaUrl: '' }, authUserRoles: [], authUserUnitIds: [] }, {});

    const data = responseData.mock.calls[0][1];
    expect(data.fullAvaUrl).toBe('');
    expect(data.avaUrl).toBe('');
  });
});

describe('AuthController PKCE login', () => {
  it('forwards the verifier to the shared token client', async () => {
    const controller = Object.create(AuthController.prototype);
    controller.config = { auth: {} };
    const getTokens = jest.fn().mockRejectedValue(new Error('stop after token request'));
    controller.idApiClient = { getTokens };
    controller.responseError = jest.fn();
    const previousLog = global.log;
    global.log = { save: jest.fn() } as any;
    try {
      await controller.login({ body: { code: 'authorization-code', code_verifier: 'a'.repeat(43) } }, {});
      expect(getTokens).toHaveBeenCalledWith('authorization-code', { codeVerifier: 'a'.repeat(43) });
    } finally {
      global.log = previousLog;
    }
  });
});

describe('AuthController.authenticateToken', () => {
  let controller: AuthController;
  const idApi: any = { getUser: jest.fn(), renewTokens: jest.fn(), getMainUserInfo: jest.fn((v) => v) };
  const decrypt = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (AuthController as any).singleton = undefined;
    (getIdApiClient as jest.Mock).mockReturnValue(idApi);
    controller = new AuthController({ auth: {}, server: { token: 'srv' }, access: {} });
    controller.token = { decrypt } as any;
    controller.getUserUnitIds = jest.fn().mockResolvedValue({ all: [1] }) as any;
  });

  it('should reject missing token', async () => {
    expect((await controller.authenticateToken(undefined, ['admin'])).status).toBe(401);
  });

  it('should reject undecryptable token', async () => {
    decrypt.mockImplementation(() => {
      throw new Error('bad');
    });
    expect((await controller.authenticateToken('x', ['admin'])).status).toBe(401);
  });

  it('should not accept server token as a user token (no role bypass)', async () => {
    decrypt.mockImplementation(() => {
      throw new Error('bad');
    });
    expect((await controller.authenticateToken('srv', ['admin'])).status).toBe(401);
  });

  it('should reject user without needed role', async () => {
    decrypt.mockReturnValue({ authTokens: { accessToken: 'a', refreshToken: 'r' } });
    idApi.getUser.mockResolvedValue({ userId: 'u', role: 'user' });
    expect((await controller.authenticateToken('x', ['admin'], [1])).status).toBe(403);
  });

  it('should reject user without needed unit', async () => {
    decrypt.mockReturnValue({ authTokens: { accessToken: 'a', refreshToken: 'r' } });
    idApi.getUser.mockResolvedValue({ userId: 'u', role: 'admin' });
    expect((await controller.authenticateToken('x', ['admin'], [2])).status).toBe(403);
  });

  it('should accept admin in needed unit', async () => {
    decrypt.mockReturnValue({ authTokens: { accessToken: 'a', refreshToken: 'r' } });
    idApi.getUser.mockResolvedValue({ userId: 'u', role: 'admin' });
    expect((await controller.authenticateToken('x', ['admin'], [1])).status).toBe(200);
  });
});

describe('AuthController.login logging', () => {
  const idApi: any = { getTokens: jest.fn(), getUser: jest.fn(), getMainUserInfo: jest.fn((v) => v) };
  const save = jest.fn();
  let controller: AuthController;
  let responseData: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).log = { save };
    (global as any).models = { unit: { getAll: jest.fn().mockResolvedValue([]) } };
    (global as any).config = { auth: { authRedirectUrl: 'http://admin.local/auth' } };
    (AuthController as any).singleton = undefined;
    (getIdApiClient as jest.Mock).mockReturnValue(idApi);
    controller = new AuthController({ auth: {}, server: { token: 'srv' }, access: {}, user: {} });
    controller.token = { generate: jest.fn().mockReturnValue('jwt') } as any;
    responseData = jest.spyOn(controller, 'responseData').mockImplementation(() => undefined);
    jest.spyOn(controller, 'setupAdminUnits').mockResolvedValue(undefined as any);
  });

  it('should not write tokens or user PII to logs on login', async () => {
    idApi.getTokens.mockResolvedValue({ accessToken: 'ACCESS-SECRET', refreshToken: 'REFRESH-SECRET' });
    idApi.getUser.mockResolvedValue({ userId: 'u1', email: 'pii@example.com', ipn: '1234567890', phone: '380000000000' });

    await controller.login({ body: { code: 'c' } }, {});

    expect(responseData).toHaveBeenCalledWith({}, { token: 'jwt' });
    const logged = JSON.stringify(save.mock.calls);
    expect(logged).not.toContain('ACCESS-SECRET');
    expect(logged).not.toContain('REFRESH-SECRET');
    expect(logged).not.toContain('pii@example.com');
    expect(logged).not.toContain('1234567890');
    expect(logged).not.toContain('380000000000');
  });
});

describe('AuthController.getCheckMiddleware server token', () => {
  let controller: AuthController;
  const decrypt = jest.fn();

  const build = (serverToken: any) => {
    (AuthController as any).singleton = undefined;
    (getIdApiClient as jest.Mock).mockReturnValue({ getUser: jest.fn(), renewTokens: jest.fn(), getMainUserInfo: jest.fn((v) => v) });
    controller = new AuthController({ auth: {}, server: { token: serverToken }, access: {} });
    controller.token = { decrypt } as any;
    jest.spyOn(controller, 'responseError').mockImplementation(() => undefined as any);
  };

  const run = async (middleware: any, token?: string) => {
    const next = jest.fn();
    await middleware({ method: 'GET', headers: token === undefined ? {} : { token } }, {}, next);
    return next;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    decrypt.mockImplementation(() => {
      throw new Error('not decryptable');
    });
    build('srv-secret');
  });

  it('should reject server token on a role-protected non-service route', async () => {
    const next = await run(controller.getCheckMiddleware(['admin'], [1]), 'srv-secret');
    expect(next).not.toHaveBeenCalled();
    expect(controller.responseError).toHaveBeenCalledWith(expect.anything(), expect.anything(), 401);
  });

  it('should accept server token on a service-only route', async () => {
    const next = await run(controller.getCheckMiddleware(['admin'], [], true), 'srv-secret');
    expect(next).toHaveBeenCalled();
  });

  it('should reject wrong token on a service-only route', async () => {
    const next = await run(controller.getCheckMiddleware(['admin'], [], true), 'srv-secreX');
    expect(next).not.toHaveBeenCalled();
    expect(controller.responseError).toHaveBeenCalledWith(expect.anything(), 'Incorrect server (admin) token.', 401);
  });

  it.each(['', undefined])('should never match when server token is %p', async (serverToken) => {
    build(serverToken);
    expect(controller.isServerToken('')).toBe(false);
    expect(controller.isServerToken('x')).toBe(false);
    const next = await run(controller.getCheckMiddleware(['admin'], [], true), 'x');
    expect(next).not.toHaveBeenCalled();
  });

  it('should compare with different length and non-string tokens safely', () => {
    expect(controller.isServerToken('srv')).toBe(false);
    expect(controller.isServerToken('srv-secret-longer')).toBe(false);
    expect(controller.isServerToken(['srv-secret'])).toBe(false);
    expect(controller.isServerToken('srv-secret')).toBe(true);
  });
});
