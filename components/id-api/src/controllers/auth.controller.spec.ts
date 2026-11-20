import { Models } from '../models';
import { Services } from '../services';
import { AuthController } from './auth.controller';

jest.mock('../middleware/authenticate', () => ({ AuthMiddleware: { get: jest.fn().mockReturnValue({}) } }));
jest.mock('../middleware/session', () => ({ saveSession: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../models', () => ({ Models: { model: jest.fn() } }));
jest.mock('../services', () => ({ Services: { service: jest.fn() } }));
jest.mock('@liquio/back-core', () => {
  const instance = { save: jest.fn() };
  return { Log: { getInstance: () => instance }, getTraceId: jest.fn(), appendTraceMeta: jest.fn() };
});

describe('AuthController.checkTwoFactorAuth', () => {
  let controller: AuthController;
  let findOne: jest.Mock;
  let sendPhoneConfirmCode: jest.Mock;
  let consumeSendQuota: jest.Mock;
  let res: any;
  let next: jest.Mock;

  const request = (session: any) => ({ session }) as any;
  const account = (values: Record<string, any>) => findOne.mockResolvedValue({ dataValues: { userId: 'u1', ...values } });

  beforeEach(() => {
    jest.clearAllMocks();
    findOne = jest.fn();
    sendPhoneConfirmCode = jest.fn().mockResolvedValue(undefined);
    consumeSendQuota = jest.fn().mockResolvedValue(true);
    (Models.model as jest.Mock).mockReturnValue({ findOne });
    (Services.service as jest.Mock).mockReturnValue({ sendPhoneConfirmCode, consumeSendQuota });
    controller = new AuthController({ get: jest.fn(), post: jest.fn() } as any, { config: {} } as any);
    res = { redirect: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    next = jest.fn();
  });

  const session = (extra: Record<string, any> = {}) => ({ passport: { user: { userId: 'u1' } }, ...extra });

  it('lets an account without 2FA in, using the persisted settings', async () => {
    account({ useTwoFactorAuth: false });

    await controller.checkTwoFactorAuth(request(session()), res, next);

    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1' } }));
    expect(next).toHaveBeenCalled();
  });

  it('ignores 2FA settings carried by the session user', async () => {
    account({ useTwoFactorAuth: true, twoFactorType: 'totp' });
    const req = request({ passport: { user: { userId: 'u1', useTwoFactorAuth: false, twoFactorType: null, totpChecked: true } } });

    await controller.checkTwoFactorAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/totp');
  });

  it('lets an account with enabled 2FA but without a selected factor in', async () => {
    account({ useTwoFactorAuth: true, twoFactorType: null });

    await controller.checkTwoFactorAuth(request(session()), res, next);

    expect(next).toHaveBeenCalled();
  });

  it('sends the phone code to the persisted phone and redirects when the phone factor is incomplete', async () => {
    account({ useTwoFactorAuth: true, twoFactorType: 'phone', phone: '+380501112233' });

    await controller.checkTwoFactorAuth(request(session()), res, next);

    expect(consumeSendQuota).toHaveBeenCalledWith('twoFactor', '+380501112233', undefined);
    expect(sendPhoneConfirmCode).toHaveBeenCalledWith('+380501112233');
    expect(res.redirect).toHaveBeenCalledWith('/');
    expect(next).not.toHaveBeenCalled();
  });

  it('does not send the phone code when the send quota is exhausted', async () => {
    account({ useTwoFactorAuth: true, twoFactorType: 'phone', phone: '+380501112233' });
    consumeSendQuota.mockResolvedValue(false);

    await controller.checkTwoFactorAuth(request(session()), res, next);

    expect(sendPhoneConfirmCode).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('redirects to /totp when the TOTP factor is incomplete', async () => {
    account({ useTwoFactorAuth: true, twoFactorType: 'totp' });

    await controller.checkTwoFactorAuth(request(session()), res, next);

    expect(res.redirect).toHaveBeenCalledWith('/totp');
    expect(next).not.toHaveBeenCalled();
  });

  it('continues when the marker matches the user and the configured factor', async () => {
    account({ useTwoFactorAuth: true, twoFactorType: 'totp' });

    await controller.checkTwoFactorAuth(request(session({ twoFactorCompleted: { userId: 'u1', factor: 'totp' } })), res, next);

    expect(next).toHaveBeenCalled();
  });

  it.each([
    ['another user', { userId: 'u2', factor: 'totp' }],
    ['another factor', { userId: 'u1', factor: 'phone' }],
    ['a malformed value', 'u1'],
  ])('rejects a marker of %s', async (_name, marker) => {
    account({ useTwoFactorAuth: true, twoFactorType: 'totp' });

    await controller.checkTwoFactorAuth(request(session({ twoFactorCompleted: marker })), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/totp');
  });

  it('fails closed when the user is not found', async () => {
    findOne.mockResolvedValue(null);

    await controller.checkTwoFactorAuth(request(session()), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('fails closed when the database lookup fails', async () => {
    findOne.mockRejectedValue(new Error('db down'));

    await controller.checkTwoFactorAuth(request(session()), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('fails closed when the session has no user', async () => {
    await controller.checkTwoFactorAuth(request({}), res, next);
    await controller.checkTwoFactorAuth(request({ passport: {} }), res, next);

    expect(findOne).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledTimes(2);
  });

  it('fails closed on an unsupported factor type', async () => {
    account({ useTwoFactorAuth: true, twoFactorType: 'sms' });

    await controller.checkTwoFactorAuth(request(session()), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/');
  });
});

describe('AuthController.getAuth send quota', () => {
  it('answers 429 and sends no SMS once the 2FA quota is exhausted', async () => {
    const sendPhoneConfirmCode = jest.fn();
    const consumeSendQuota = jest.fn().mockResolvedValue(false);
    (Services.service as jest.Mock).mockReturnValue({ sendPhoneConfirmCode, consumeSendQuota });
    const controller = new AuthController({ get: jest.fn(), post: jest.fn() } as any, { config: {} } as any);
    const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const req: any = {
      ip: '10.0.0.1',
      session: { passport: { user: { useTwoFactorAuth: true, twoFactorType: 'phone', phone: '+380501112233' } } },
    };

    await controller.getAuth(req, res);

    expect(consumeSendQuota).toHaveBeenCalledWith('twoFactor', '+380501112233', '10.0.0.1');
    expect(sendPhoneConfirmCode).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
  });
});
