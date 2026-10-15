import { matchedData } from 'express-validator';

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
