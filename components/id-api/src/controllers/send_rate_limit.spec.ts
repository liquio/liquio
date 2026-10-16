import { matchedData } from 'express-validator';

import { Services } from '../services';
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

describe('confirmation code send routes are rate limited (ID-20)', () => {
  let auth: any;
  let notify: any;
  let res: any;
  const router = { get: jest.fn(), post: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    auth = {
      consumeSendQuota: jest.fn().mockResolvedValue(false),
      getUser: jest.fn().mockResolvedValue(null),
      removeConfirmCode: jest.fn(),
      saveConfirmCodeAsync: jest.fn(),
      sendPhoneConfirmCode: jest.fn(),
      generatePinCode: jest.fn().mockReturnValue('123456'),
    };
    notify = { sendMail: jest.fn() };
    (Services.service as jest.Mock).mockImplementation((name: string) => (name === 'auth' ? auth : notify));
    res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
  });

  const signUp = () => new SignUpController(router, { config: {} } as any);
  const user = () => new UserController(router, { config: {} } as any);
  const req = { ip: '9.9.9.9', user: { id: 'u1' }, body: { phone: '+380501' }, session: {} } as any;

  it('GET /sign_up/confirmation/email/send answers 429 and neither stores nor sends a code', async () => {
    (matchedData as jest.Mock).mockReturnValue({ email: 'A@B.com' });
    await signUp().sendEmailConfirm(req, res);

    expect(auth.consumeSendQuota).toHaveBeenCalledWith('email', 'a@b.com', '9.9.9.9');
    expect(res.status).toHaveBeenCalledWith(429);
    expect(auth.getUser).not.toHaveBeenCalled();
    expect(auth.saveConfirmCodeAsync).not.toHaveBeenCalled();
    expect(notify.sendMail).not.toHaveBeenCalled();
  });

  it('GET /sign_up/confirmation/phone/send answers 429 and sends no SMS', async () => {
    (matchedData as jest.Mock).mockReturnValue({ phone: '+380501' });
    await signUp().sendPhoneConfirm(req, res);

    expect(auth.consumeSendQuota).toHaveBeenCalledWith('phone', '+380501', '9.9.9.9');
    expect(res.status).toHaveBeenCalledWith(429);
    expect(auth.sendPhoneConfirmCode).not.toHaveBeenCalled();
  });

  it('GET /user/info/email/send answers 429 and sends no email', async () => {
    (matchedData as jest.Mock).mockReturnValue({ email: 'a@b.com' });
    await user().sendToNewEmailCode(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(auth.removeConfirmCode).not.toHaveBeenCalled();
    expect(notify.sendMail).not.toHaveBeenCalled();
  });

  it('POST /user/info/phone/send answers 429 and sends no SMS', async () => {
    await user().sendPhoneConfirmation(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(auth.sendPhoneConfirmCode).not.toHaveBeenCalled();
  });

  it('still sends when the quota allows it', async () => {
    auth.consumeSendQuota.mockResolvedValue(true);
    (matchedData as jest.Mock).mockReturnValue({ phone: '+380501' });
    await signUp().sendPhoneConfirm(req, res);

    expect(auth.sendPhoneConfirmCode).toHaveBeenCalledWith('+380501', 'u1');
  });
});
