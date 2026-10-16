import { matchedData } from 'express-validator';

import { Services } from '../services';
import { Models } from '../models';
import { SignUpController } from './sign_up.controller';
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

describe('anonymous account-existence oracles are closed (ID-25, GI-14, KS-34)', () => {
  let auth: any;
  let notify: any;
  let userModel: any;
  let res: any;
  const router = { get: jest.fn(), post: jest.fn() } as any;
  const req = { ip: '9.9.9.9', session: {}, body: {} } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    auth = {
      consumeSendQuota: jest.fn().mockResolvedValue(true),
      getUser: jest.fn(),
      removeConfirmCode: jest.fn(),
      getValidConfirmCode: jest.fn(),
      incrementConfirmCodeCounterAsync: jest.fn().mockResolvedValue(1),
      saveConfirmCodeAsync: jest.fn(),
      generatePinCode: jest.fn().mockReturnValue('123456'),
      getClientByRedirectUri: jest.fn().mockResolvedValue({ clientId: 'c1' }),
    };
    notify = { sendMail: jest.fn() };
    userModel = { findOne: jest.fn(), create: jest.fn(), destroy: jest.fn().mockResolvedValue(1) };
    (Services.service as jest.Mock).mockImplementation((name: string) =>
      name === 'auth' ? auth : name === 'passwordManager' ? { isStrongPassword: () => ({ strong: true }) } : notify,
    );
    (Models.model as jest.Mock).mockReturnValue(userModel);
    res = { status: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn(), redirect: jest.fn() };
  });

  const config = { oauth: { defaults: { redirect_uri: 'https://app/cb' } } };
  const signUp = () => new SignUpController(router, { config: {} } as any);
  const user = () => new UserController(router, { config } as any);

  it('email/send answers "null" and sends nothing for a registered email', async () => {
    (matchedData as jest.Mock).mockReturnValue({ email: 'A@B.com' });
    auth.getUser.mockResolvedValue({ userId: 'u1', status: 'active' });
    await signUp().sendEmailConfirm(req, res);

    expect(res.send).toHaveBeenCalledWith('null');
    expect(auth.consumeSendQuota).toHaveBeenCalledWith('email', 'a@b.com', '9.9.9.9');
    expect(auth.saveConfirmCodeAsync).not.toHaveBeenCalled();
    expect(notify.sendMail).toHaveBeenCalledTimes(1);
    expect(notify.sendMail).toHaveBeenCalledWith('a@b.com', expect.not.stringContaining('123456'), expect.any(String));
  });

  it('email/send sends the account-exists notice only after the quota check, and not when limited', async () => {
    (matchedData as jest.Mock).mockReturnValue({ email: 'a@b.com' });
    auth.consumeSendQuota.mockResolvedValue(false);
    auth.getUser.mockResolvedValue({ userId: 'u1', status: 'active' });
    await signUp().sendEmailConfirm(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(notify.sendMail).not.toHaveBeenCalled();
  });

  it('email/send uses the configured notice and still answers "null" when the notice fails', async () => {
    (matchedData as jest.Mock).mockReturnValue({ email: 'a@b.com' });
    auth.getUser.mockResolvedValue({ userId: 'u1', status: 'active' });
    notify.sendMail.mockRejectedValue(new Error('smtp down'));
    const controller = new SignUpController(router, { config: { accountExistsEmailHeader: 'H', accountExistsEmailText: 'T' } } as any);
    await controller.sendEmailConfirm(req, res);

    expect(notify.sendMail).toHaveBeenCalledWith('a@b.com', 'T', 'H');
    expect(res.send).toHaveBeenCalledWith('null');
  });

  it('email/send answers "null" for an unknown email too', async () => {
    (matchedData as jest.Mock).mockReturnValue({ email: 'a@b.com' });
    auth.getUser.mockRejectedValue(new Error('user not found'));
    await signUp().sendEmailConfirm(req, res);

    expect(res.send).toHaveBeenCalledWith('null');
    expect(auth.saveConfirmCodeAsync).toHaveBeenCalled();
    expect(notify.sendMail).toHaveBeenCalledTimes(1);
  });

  it('email/exist and phone/exist never look the account up and give a constant answer', async () => {
    (matchedData as jest.Mock).mockReturnValue({ email: 'a@b.com', phone: '+380501' });
    await signUp().checkEmailExist(req, res);
    await signUp().checkPhoneExist(req, res);

    expect(auth.getUser).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenNthCalledWith(1, 'null');
    expect(res.send).toHaveBeenNthCalledWith(2, false);
  });

  it('POST /sign_up answers 201 with the same body for an existing email (valid code) and creates nothing', async () => {
    auth.getValidConfirmCode.mockResolvedValue({ id: 1 });
    userModel.findOne.mockResolvedValue({ userId: 'u1' });
    await signUp().signUpUser({ body: { email: 'a@b.com', password: 'Str0ng!pass', code: '123456' } } as any, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'User registered successfully' });
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('POST /sign_up without a code gives an existing and an unknown email the identical 400', async () => {
    const answer = async (email: string, existing: boolean) => {
      const r: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      userModel.findOne.mockResolvedValue(existing ? { userId: 'u1' } : null);
      await signUp().signUpUser({ body: { email, password: 'Str0ng!pass' } } as any, r);
      return [r.status.mock.calls, r.json.mock.calls];
    };
    const registered = await answer('a@b.com', true);
    const unknown = await answer('c@d.com', false);

    expect(registered).toEqual(unknown);
    expect(registered[0]).toEqual([[400]]);
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('GET /subscribe redirects identically whether or not the account exists', async () => {
    (matchedData as jest.Mock).mockReturnValue({ email: 'a@b.com' });
    auth.getUser.mockResolvedValue({ userId: 'u1', status: 'active' });
    await user().promoSubscribe(req, res);
    auth.getUser.mockRejectedValue(new Error('user not found'));
    await user().promoSubscribe(req, res);

    expect(auth.getUser).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledTimes(2);
    expect(res.redirect.mock.calls[0]).toEqual(res.redirect.mock.calls[1]);
  });
});
