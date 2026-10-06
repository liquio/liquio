import * as api from 'services/api';
import store from 'store';

import { urlParams } from 'helpers/getUrlParams';
import type { AppDispatch } from '../store/types';

// `store` does not import `actions` or `services/api`, so reading it here at module level is not circular.
type Dispatch = AppDispatch;
const dispatch: Dispatch = store.dispatch;

const GET_AUTH = 'GET_AUTH';
const LOGOUT = 'LOGOUT';

const SEND_SMS_CODE = 'SEND_SMS_CODE';
const CHECK_SMS_CODE = 'CHECK_SMS_CODE';
const VERIFY_SMS_CODE = 'VERIFY_SMS_CODE';

const SEND_EMAIL_CODE = 'SEND_EMAIL_CODE';
const VERIFY_EMAIL_CODE = 'VERIFY_EMAIL_CODE';

const CHECK_TOTP_CODE = 'CHECK_TOTP_CODE';

const CHECK_PHONE_EXISTS = 'CHECK_PHONE_EXISTS';
const SEND_ACTIVATION_CODE_SMS = 'SEND_ACTIVATION_CODE_SMS';
const VERIFY_ACTIVATION_CODE_SMS = 'VERIFY_ACTIVATION_CODE_SMS';

const SEND_ACTIVATION_CODE_EMAIL = 'SEND_ACTIVATION_CODE_EMAIL';
const VERIFY_ACTIVATION_CODE_EMAIL = 'VERIFY_ACTIVATION_CODE_EMAIL';

const SIGNUP_CONFIRMATION = 'SIGNUP_CONFIRMATION';

export function getAuth() {
  return api.get('auth', GET_AUTH, dispatch);
}

export function logout() {
  return api.get('logout', LOGOUT, dispatch);
}

export function sendSMSCode(phone: string) {
  return api.post('users/phone/send_sms', { phone }, SEND_SMS_CODE, dispatch);
}

export function checkSMSCode(code: string) {
  return api.post(
    'sign_up/confirmation/phone/check',
    { code },
    CHECK_SMS_CODE,
    dispatch
  );
}

export function checkTotpCode(code: string) {
  return api.post(
    'authorise/totp',
    { code },
    CHECK_TOTP_CODE,
    dispatch
  );
}

export function verifySMSCode(phone: string, code: string) {
  return api.post(
    'users/phone/verify',
    { phone, code },
    VERIFY_SMS_CODE,
    dispatch
  );
}

export function sendEmailCode(email: string) {
  return api.put('users/email/change', { email }, SEND_EMAIL_CODE, dispatch);
}

export function verifyEmailCode(email: string, code: string) {
  return api.post(
    'users/email/confirm',
    { email, code },
    VERIFY_EMAIL_CODE,
    dispatch
  );
}

export function checkPhoneExists(phone: string) {
  return api.get(
    'sign_up/confirmation/phone/exist?' + urlParams({ phone }),
    CHECK_PHONE_EXISTS,
    dispatch
  );
}

export function sendActivationCodeSMS(phone: string) {
  return api.get(
    'sign_up/confirmation/phone/send?' + urlParams({ phone }),
    SEND_ACTIVATION_CODE_SMS,
    dispatch
  );
}

export function verifyActivationCodeSMS(phone: string, code: string) {
  return api.get(
    'sign_up/confirmation/phone/verify?' + urlParams({ phone, code }),
    VERIFY_ACTIVATION_CODE_SMS,
    dispatch
  );
}

export function sendActivationCodeEmail(email: string) {
  return api.get(
    'sign_up/confirmation/email/send?' + urlParams({ email }),
    SEND_ACTIVATION_CODE_EMAIL,
    dispatch
  );
}

export function verifyActivationCodeEmail(email: string, code: string) {
  return api.get(
    'sign_up/confirmation/email/verify?' + urlParams({ email, code }),
    VERIFY_ACTIVATION_CODE_EMAIL,
    dispatch
  );
}

export function signUpConfirmation(registerData: unknown) {
  return api.post(
    'sign_up/confirmation',
    registerData,
    SIGNUP_CONFIRMATION,
    dispatch
  );
}

export function handleLoginByPassword(body: unknown) {
  return api.post(
    'authorise/local',
    body,
    'LOGIN_PASSWORD',
    dispatch
  );
}

export function handleLoginByLdap(body: unknown) {
  return api.post(
    'authorise/ldap',
    body,
    'LOGIN_LDAP',
    dispatch
  );
}

export function handleChangePassword(body: unknown) {
  return api.post(
    'authorise/local/change_password',
    body,
    'CHANGE_PASSWORD',
    dispatch
  );
}

export function handleCreateByLoginPassword(body: unknown) {
  return api.post(
    'sign_up',
    body,
    'CREATE_USER',
    dispatch
  )
}

export function handleResetPassword(body: unknown) {
  return api.post(
    'user/password/reset',
    body,
    'RESET_PASSWORD',
    dispatch
  )
}

export function handleSendCode(body: unknown) {
  return api.post(
    'user/password/forgot',
    body,
    'SEND_CODE',
    dispatch
  )
}

export function handlePKCS7Auth(pkcs7: unknown) {
  return api.post(
    'authorise/x509',
    { pkcs7 },
    'PKCS7_AUTH',
    dispatch
  );
}