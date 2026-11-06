import { matchedData } from 'express-validator';

import { Models } from '../models';
import { Services } from '../services';
import { UserController } from './user.controller';

jest.mock('express-validator', () => ({ ...jest.requireActual('express-validator'), matchedData: jest.fn() }));
jest.mock('../middleware/authenticate', () => ({ AuthMiddleware: { get: jest.fn().mockReturnValue({}) } }));
jest.mock('../middleware/session', () => ({ saveSession: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../models', () => ({ Models: { model: jest.fn() } }));
jest.mock('../services', () => ({ Services: { service: jest.fn() } }));
jest.mock('@liquio/back-core', () => {
  const instance = { save: jest.fn() };
  return { Log: { getInstance: () => instance }, getTraceId: jest.fn(), appendTraceMeta: jest.fn() };
});

describe('UserController.logOff', () => {
  const REGISTERED = 'https://app.example/auth';
  let controller: UserController;
  let res: any;
  let auth: any;

  const logOff = (forward: unknown) => {
    (matchedData as jest.Mock).mockReturnValue({ forward });
    const req: any = { params: { service: 'eds' }, session: { passport: { user: { userId: 'u1' } } } };
    return controller.logOff(req, res);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    auth = {
      getUser: jest.fn().mockResolvedValue({ userId: 'u1' }),
      removeServiceFromUserAsync: jest.fn().mockResolvedValue(undefined),
      getRegisteredRedirectUris: jest.fn().mockResolvedValue([REGISTERED]),
    };
    (Services.service as jest.Mock).mockReturnValue(auth);
    controller = new UserController({ get: jest.fn(), post: jest.fn() } as any, { config: {} } as any);
    res = { redirect: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
  });

  it.each([
    ['a local path', '/profile', '/profile'],
    ['an exact registered URI', REGISTERED, REGISTERED],
    ['an absent forward', undefined, '/'],
    ['an attacker origin', 'https://evil.example/', '/'],
    ['a prefix lookalike host', `${REGISTERED}.evil.example`, '/'],
    ['a protocol-relative URL', '//evil.example', '/'],
    ['a backslash protocol-relative URL', '/\\evil.example', '/'],
    ['an encoded protocol-relative URL', '%2F%2Fevil.example', '/'],
  ])('redirects %s safely', async (_name, forward, expected) => {
    await logOff(forward);

    expect(auth.removeServiceFromUserAsync).toHaveBeenCalledWith({ provider: 'eds', userId: 'u1' });
    expect(res.redirect).toHaveBeenCalledWith(expected);
  });
});

describe('UserController.setTwoFactorAuth (ID-09d)', () => {
  let controller: UserController;
  let res: any;
  let auth: any;
  let userModel: any;
  let user: any;

  const call = (body: Record<string, any>, scope: any = ['profile:write']) => {
    res.locals = { oauth: { token: { scope } } };
    const req: any = { user: { id: 'u1' }, body, session: {} };
    return controller.setTwoFactorAuth(req, res);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    user = { userId: 'u1', phone: '+380501110001', valid: { phone: true }, useTwoFactorAuth: false, twoFactorType: null };
    auth = {
      getUser: jest.fn().mockImplementation(async () => user),
      updateUser: jest.fn().mockResolvedValue({ userId: 'u1' }),
      consumePhoneChallenge: jest.fn().mockResolvedValue(true),
    };
    userModel = { create: jest.fn().mockResolvedValue({}) };
    (Services.service as jest.Mock).mockReturnValue(auth);
    controller = new UserController({ get: jest.fn(), post: jest.fn() } as any, { config: {} } as any);
    (Models.model as jest.Mock).mockReturnValue(userModel);
    res = { status: jest.fn().mockReturnThis(), send: jest.fn(), locals: {} };
  });

  const expectRefused = (status: number) => {
    expect(res.status).toHaveBeenCalledWith(status);
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(userModel.create).not.toHaveBeenCalled();
  };

  it('enables phone 2FA for a verified phone and audits it', async () => {
    await call({ useTwoFactorAuth: 'true' });
    expect(auth.updateUser).toHaveBeenCalledWith({ userId: 'u1' }, { useTwoFactorAuth: true, twoFactorType: 'phone' });
    expect(userModel.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', action_type: 'update' }));
    expect(res.send).toHaveBeenCalledWith('ok');
  });

  it('refuses to enable for an unverified or missing phone', async () => {
    user.valid = { phone: false };
    await call({ useTwoFactorAuth: true });
    expectRefused(400);
  });

  it('refuses a token without the 2FA scope', async () => {
    await call({ useTwoFactorAuth: true }, ['gender']);
    expectRefused(403);
  });

  it.each([{ useTwoFactorAuth: 'maybe' }, { useTwoFactorAuth: true, twoFactorType: 'totp' }, { useTwoFactorAuth: true, code: 123 }])(
    'refuses invalid input %j',
    async (body) => {
      await call(body);
      expectRefused(400);
    },
  );

  it('refuses any change while TOTP is active', async () => {
    user = { ...user, useTwoFactorAuth: true, twoFactorType: 'totp' };
    await call({ useTwoFactorAuth: false, code: '123456' });
    expectRefused(400);
    expect(auth.consumePhoneChallenge).not.toHaveBeenCalled();
  });

  it('refuses to disable phone 2FA without a code or with a wrong one', async () => {
    user = { ...user, useTwoFactorAuth: true, twoFactorType: 'phone' };
    await call({ useTwoFactorAuth: false });
    expectRefused(400);
    auth.consumePhoneChallenge.mockResolvedValue(false);
    await call({ useTwoFactorAuth: false, code: '000000' });
    expectRefused(400);
    expect(auth.consumePhoneChallenge).toHaveBeenCalledWith('u1', '+380501110001', '000000');
  });

  it('disables phone 2FA with a valid code', async () => {
    user = { ...user, useTwoFactorAuth: true, twoFactorType: 'phone' };
    await call({ useTwoFactorAuth: false, code: '123456' });
    expect(auth.updateUser).toHaveBeenCalledWith({ userId: 'u1' }, { useTwoFactorAuth: false, twoFactorType: 'phone' });
    expect(res.send).toHaveBeenCalledWith('ok');
  });
});
