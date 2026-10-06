import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as actions from './auth';

const { api, dispatch } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  dispatch: vi.fn(),
}));

vi.mock('services/api', () => api);
vi.mock('store', () => ({ default: { dispatch } }));

describe('actions/auth', () => {
  beforeEach(() => {
    api.get.mockReset().mockResolvedValue('result');
    api.post.mockReset().mockResolvedValue('result');
    api.put.mockReset().mockResolvedValue('result');
  });

  it('getAuth requests auth', async () => {
    expect(await actions.getAuth()).toBe('result');
    expect(api.get).toHaveBeenCalledWith('auth', 'GET_AUTH', dispatch);
  });

  it('logout requests logout', () => {
    actions.logout();
    expect(api.get).toHaveBeenCalledWith('logout', 'LOGOUT', dispatch);
  });

  it('sendSMSCode posts the phone', () => {
    actions.sendSMSCode('+380');
    expect(api.post).toHaveBeenCalledWith('users/phone/send_sms', { phone: '+380' }, 'SEND_SMS_CODE', dispatch);
  });

  it('checkSMSCode posts the code', () => {
    actions.checkSMSCode('123');
    expect(api.post).toHaveBeenCalledWith('sign_up/confirmation/phone/check', { code: '123' }, 'CHECK_SMS_CODE', dispatch);
  });

  it('checkTotpCode posts the code', () => {
    actions.checkTotpCode('123');
    expect(api.post).toHaveBeenCalledWith('authorise/totp', { code: '123' }, 'CHECK_TOTP_CODE', dispatch);
  });

  it('verifySMSCode posts the phone and the code', () => {
    actions.verifySMSCode('+380', '1');
    expect(api.post).toHaveBeenCalledWith('users/phone/verify', { phone: '+380', code: '1' }, 'VERIFY_SMS_CODE', dispatch);
  });

  it('sendEmailCode puts the email', () => {
    actions.sendEmailCode('a@b');
    expect(api.put).toHaveBeenCalledWith('users/email/change', { email: 'a@b' }, 'SEND_EMAIL_CODE', dispatch);
  });

  it('verifyEmailCode posts the email and the code', () => {
    actions.verifyEmailCode('a@b', '1');
    expect(api.post).toHaveBeenCalledWith('users/email/confirm', { email: 'a@b', code: '1' }, 'VERIFY_EMAIL_CODE', dispatch);
  });

  it('checkPhoneExists puts the phone in the query string without encoding it', () => {
    actions.checkPhoneExists('+380 50');
    expect(api.get).toHaveBeenCalledWith('sign_up/confirmation/phone/exist?phone=+380 50', 'CHECK_PHONE_EXISTS', dispatch);
  });

  it('sendActivationCodeSMS requests the code by phone', () => {
    actions.sendActivationCodeSMS('1');
    expect(api.get).toHaveBeenCalledWith('sign_up/confirmation/phone/send?phone=1', 'SEND_ACTIVATION_CODE_SMS', dispatch);
  });

  it('verifyActivationCodeSMS sends the phone and the code in the query string', () => {
    actions.verifyActivationCodeSMS('1', '2');
    expect(api.get).toHaveBeenCalledWith(
      'sign_up/confirmation/phone/verify?phone=1&code=2',
      'VERIFY_ACTIVATION_CODE_SMS',
      dispatch,
    );
  });

  it('sendActivationCodeEmail requests the code by email', () => {
    actions.sendActivationCodeEmail('a@b');
    expect(api.get).toHaveBeenCalledWith('sign_up/confirmation/email/send?email=a@b', 'SEND_ACTIVATION_CODE_EMAIL', dispatch);
  });

  it('verifyActivationCodeEmail sends the email and the code in the query string', () => {
    actions.verifyActivationCodeEmail('a@b', '2');
    expect(api.get).toHaveBeenCalledWith(
      'sign_up/confirmation/email/verify?email=a@b&code=2',
      'VERIFY_ACTIVATION_CODE_EMAIL',
      dispatch,
    );
  });

  it('signUpConfirmation posts the register data as is', () => {
    const data = { a: 1 };
    actions.signUpConfirmation(data);
    expect(api.post).toHaveBeenCalledWith('sign_up/confirmation', data, 'SIGNUP_CONFIRMATION', dispatch);
  });

  it('handleLoginByPassword posts the credentials', () => {
    const body = { login: 'l', password: 'p' };
    actions.handleLoginByPassword(body);
    expect(api.post).toHaveBeenCalledWith('authorise/local', body, 'LOGIN_PASSWORD', dispatch);
  });

  it('handleLoginByLdap posts the credentials', () => {
    const body = { login: 'l' };
    actions.handleLoginByLdap(body);
    expect(api.post).toHaveBeenCalledWith('authorise/ldap', body, 'LOGIN_LDAP', dispatch);
  });

  it('handleChangePassword posts the body', () => {
    const body = { password: 'p' };
    actions.handleChangePassword(body);
    expect(api.post).toHaveBeenCalledWith('authorise/local/change_password', body, 'CHANGE_PASSWORD', dispatch);
  });

  it('handleCreateByLoginPassword posts the body', () => {
    const body = { login: 'l' };
    actions.handleCreateByLoginPassword(body);
    expect(api.post).toHaveBeenCalledWith('sign_up', body, 'CREATE_USER', dispatch);
  });

  it('handleResetPassword posts the body', () => {
    const body = { code: 'c' };
    actions.handleResetPassword(body);
    expect(api.post).toHaveBeenCalledWith('user/password/reset', body, 'RESET_PASSWORD', dispatch);
  });

  it('handleSendCode posts the body', () => {
    const body = { login: 'l' };
    actions.handleSendCode(body);
    expect(api.post).toHaveBeenCalledWith('user/password/forgot', body, 'SEND_CODE', dispatch);
  });

  it('handlePKCS7Auth posts the signature', () => {
    actions.handlePKCS7Auth('sig');
    expect(api.post).toHaveBeenCalledWith('authorise/x509', { pkcs7: 'sig' }, 'PKCS7_AUTH', dispatch);
  });
});
