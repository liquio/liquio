import CyrillicToTranslit from 'cyrillic-to-translit-js';
import PropByPath from 'prop-by-path';

import BaseProvider from './provider';
import HttpRequest from '../../http_request';
import { getTraceId } from '../../async_local_storage';

// Constants.
const DEFAULT_ROUTES = {
  getCode: '/authorise',
  getToken: '/oauth/token/',
  getUserInfo: '/user/info',
  getUserInfoById: '/user/info/id',
  searchUsers: '/user/info/search',
  getUserByCode: '/user/info/ipn',
  updateUserInfo: '/user/info',
  updateUserOnboarding: '/user/info/onboarding',
  deleteUser: '/user',
  sendSms: '/sign_up/confirmation/phone/send',
  verifyPhone: '/sign_up/confirmation/phone/verify',
  verifyPhoneAndSet: '/sign_up/confirmation/phone/verify',
  phoneExist: '/sign_up/confirmation/phone/exist',
  changeEmail: '/user/info/email/send',
  confirmChangeEmail: '/user/info/email/set',
  changePassword: '/authorise/local/change_password',
  checkEmail: '/user/info/email/check',
  logoutOtherSessions: '/user/logout_other_sessions',
  addTestCode: '/oauth/token/test_code',
  ping: '/test/ping',
  pingWithAuth: '/test/ping_with_auth',
  prepareUser: '/user/prepare',
  generateUserTotp: '/totp/generate',
  enableUserTotpSecret: '/totp/enable',
  disableUserTotpSecret: '/totp/disable',
};
const USER_INFO_UPDATED_RESPONSE = 'ok';
const SEARCH_USERS_LIMIT = 10;
const ERROR_MESSAGE_TOKENS_NOT_RESPONSED = 'Access or refresh tokens not responsed from auth server.';
const ERROR_MESSAGE_USER_ID_NOT_RESPONSED = 'User ID not responsed from auth server.';
const ERROR_MESSAGE_USERS_LIST_NOT_RESPONSED = 'Users list not responsed from auth server.';
const ERROR_MESSAGE_USER_NOT_RESPONSED = 'User not responsed from auth server.';
const ERROR_MESSAGE_USER_SMS_NOT_RESPONSED = 'Phone verification not responsed from auth server.';
const ERROR_MESSAGE_USER_CHANGE_EMAIL_NOT_RESPONSED = 'Change email not responsed from auth server.';
const ERROR_MESSAGE_USER_CONFIRMATION_CHANGE_EMAIL_NOT_RESPONSED = 'Confirmation change email not responsed from auth server.';
const ERROR_MESSAGE_EMAIL_EXISTENCE_NOT_RESPONSED = 'Email existence status not responsed from auth server.';
const ERROR_MESSAGE_WRONG_RESPONSE_FORMAT = 'Wrong response format.';
const ERROR_MESSAGE_WRONG_RESPONSE_DATA_FORMAT = 'Wrong response data format.';
const SUCCESSFUL_SENT_SMS = 'confirm';

export interface TokenResult {
  accessToken: string;
  refreshToken: string;
}

export interface UserInfo {
  userId: string;
  address?: string;
  addressStruct?: Record<string, unknown>;
  name: string;
  ceoName?: string;
  isLegal: boolean;
  isIndividualEntrepreneur?: boolean;
  companyName?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  middle_name?: string;
  middleName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  birthday?: string;
  avaUrl?: string;
  status?: string;
  valid?: Record<string, unknown>;
  position?: string;
  pem?: string;
  encodeCertSerial?: string;
  encodeCert?: string;
  services?: any;
}

/**
 * Liquio ID provider.
 */
export default class LiquioIdProvider extends BaseProvider {
  server: string;
  port: number;
  routes: typeof DEFAULT_ROUTES;
  timeout: number;
  clientId: string;
  clientSecret: string;
  basicAuthHeader: string;
  canDeleteUser: boolean;
  config: any;
  static singleton: LiquioIdProvider;

  /**
   * Constructor.
   * @param authConfig Auth config object.
   */
  constructor(authConfig: any) {
    if (!LiquioIdProvider.singleton) {
      super();

      this.config = authConfig;
      this.server = authConfig.server;
      this.port = authConfig.port;
      this.routes = { ...DEFAULT_ROUTES, ...authConfig.routes };
      this.timeout = authConfig.timeout || 30000;
      this.clientId = authConfig.clientId;
      this.clientSecret = authConfig.clientSecret;
      this.basicAuthHeader = `Basic ${authConfig.basicAuthToken}`;
      this.canDeleteUser = authConfig.canDeleteUser || false;
      LiquioIdProvider.singleton = this;
    }

    return LiquioIdProvider.singleton;
  }

  /**
   * Get provider name.
   */
  static get providerName(): string {
    return 'LiquioId';
  }

  /**
   * Get tokens.
   * @param code Auth code.
   * @returns Token result.
   */
  async getTokens(code: string): Promise<TokenResult> {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.getToken}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_FORM_URL_ENCODED,
        'x-trace-id': getTraceId(),
      },
      body: `grant_type=authorization_code&code=${code}&client_id=${this.clientId}&client_secret=${this.clientSecret}`,
    });

    if (!response.access_token || !response.refresh_token) {
      global.log.save('login-error-id-response-without-tokens', response);
      throw new Error(ERROR_MESSAGE_TOKENS_NOT_RESPONSED);
    }

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    };
  }

  /**
   * Renew tokens.
   * @param refreshToken Refresh token.
   * @returns Token result.
   */
  async renewTokens(refreshToken: string): Promise<TokenResult> {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.getToken}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_FORM_URL_ENCODED,
        'x-trace-id': getTraceId(),
      },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${this.clientId}&client_secret=${this.clientSecret}`,
    });

    if (!response.access_token || !response.refresh_token) {
      throw new Error(ERROR_MESSAGE_TOKENS_NOT_RESPONSED);
    }

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    };
  }

  /**
   * Get user info.
   * @param accessToken Liquio ID access token.
   * @returns User data.
   */
  async getUser(accessToken: string): Promise<any> {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.getUserInfo}?access_token=${accessToken}`,
      method: HttpRequest.Methods.GET,
      headers: { 'x-trace-id': getTraceId() },
      timeout: this.timeout,
    });

    if (!response.userId) {
      global.log.save('login-error-id-response-without-user-id', response, 'error');
      throw new Error(ERROR_MESSAGE_USER_ID_NOT_RESPONSED);
    }
    if (!response.services) {
      global.log.save('login-error-id-response-without-user-eds-pem', response);
    }

    return response;
  }

  /**
   * Update user info.
   * @param userId User ID.
   * @param accessToken Liquio ID access token.
   * @param options Update options.
   * @returns Is updated indicator.
   */
  async updateUser(userId: string, accessToken: string, options: Record<string, any> = {}): Promise<boolean> {
    const bodyRequiredProperties = `MIME+Type=application%2Fx-www-form-urlencoded&userId=${userId}&access_token=${accessToken}`;
    const updatingParams: Record<string, any> = {
      gender: options.gender,
      birthday: options.birthday,
      legalEntityDateRegistration: options.legalEntityDateRegistration,
      phone: options.phone,
      isValidPhone: options.isValidPhone && 'true',
      'valid[phone]': options.valid && options.valid.phone && 'true',
      useTwoFactorAuth: options.useTwoFactorAuth,
      twoFactorType: options.useTwoFactorAuth ? options.twoFactorType || 'phone' : undefined,
      isIndividualEntrepreneur: options.isIndividualEntrepreneur === true ? 'true' : options.isIndividualEntrepreneur === false ? 'false' : undefined,
      address: options.address,
      addressStruct: options.addressStruct && JSON.stringify(options.addressStruct),
      passport_series: options.passportSeries,
      passport_number: options.passportNumber,
      passport_issue_date: options.passportIssueDate,
      passport_issued_by: options.passportIssuedBy,
      id_card_number: options.idCardNumber,
      id_card_issue_date: options.idCardIssueDate,
      id_card_issued_by: options.idCardIssuedBy,
      id_card_expiry_date: options.idCardExpiryDate,
      is_private_house: options.isPrivateHouse === true ? 'true' : options.isPrivateHouse === false ? 'false' : undefined,
    };

    const bodyUpdatingParamsArray = Object.entries(updatingParams)
      .filter((v) => typeof v[1] === 'string')
      .map((v) => `&${v[0]}=${encodeURIComponent(v[1] as string)}`);
    const bodyUpdatingParams = bodyUpdatingParamsArray.join('');
    const body = `${bodyRequiredProperties}${bodyUpdatingParams}`;

    global.log.save('user-info-updating-request', body);
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.updateUserInfo}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_FORM_URL_ENCODED,
        'x-trace-id': getTraceId(),
      },
      body,
      timeout: this.timeout,
    });
    global.log.save('user-info-updating-response', response);

    const isUpdated = response === USER_INFO_UPDATED_RESPONSE;
    return isUpdated;
  }

  /**
   * Get user by ID or IDs.
   * @param usersIds User ID or IDs list.
   * @param withPrivateProps With private properties.
   * @returns Users info.
   */
  async getUsersByIds(usersIds: string | string[], withPrivateProps = false): Promise<UserInfo[]> {
    const normalizedUserIds = (Array.isArray(usersIds) ? usersIds : [usersIds]).filter((v: string) => typeof v === 'string' && v.length === 24);

    if (normalizedUserIds.length === 0) {
      return [];
    }

    const bodyObject = { id: normalizedUserIds };

    global.log.save('get-user-by-id-request', bodyObject);
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.getUserInfoById}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      body: JSON.stringify(bodyObject),
      timeout: this.timeout,
    });
    global.log.save('get-user-by-id-response', {
      usersIds,
      normalizedUserIds,
      response,
    });

    if (!Array.isArray(response)) {
      throw new Error(ERROR_MESSAGE_USER_NOT_RESPONSED);
    }

    return response.map((user: any) => this.getMainUserInfo(user, withPrivateProps));
  }

  /**
   * Update user onboarding.
   * @param userId User ID.
   * @param params Params.
   */
  async updateUserOnboarding(userId: string, params: { onboardingTaskId: string; needOnboarding: boolean }): Promise<void> {
    const bodyObject = {
      userId,
      onboardingTaskId: params.onboardingTaskId,
      needOnboarding: params.needOnboarding,
    };

    global.log.save('update-user-onboarding-request', bodyObject);
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.updateUserOnboarding}`,
      method: HttpRequest.Methods.PUT,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      body: JSON.stringify(bodyObject),
      timeout: this.timeout,
    });

    global.log.save('update-user-onboarding-response', response);
  }

  /**
   * Search users.
   * @param searchString Search string.
   * @returns Users info.
   */
  async searchUsers(searchString: string): Promise<UserInfo[]> {
    const bodyObject = { searchString, limit: SEARCH_USERS_LIMIT };

    global.log.save('user-searching-request', bodyObject);
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.searchUsers}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      body: JSON.stringify(bodyObject),
      timeout: this.timeout,
    });
    global.log.save('user-searching-response', response);

    if (!Array.isArray(response)) {
      throw new Error(ERROR_MESSAGE_USERS_LIST_NOT_RESPONSED);
    }

    const mainUsersInfo = response.map((user: any) => this.getMainUserInfo(user));

    return mainUsersInfo;
  }

  /**
   * Get user by code.
   * @param code Code.
   * @param withPrivateProps With private properties.
   * @returns User or users info.
   */
  async getUserByCode(code: number | number[], withPrivateProps = false): Promise<any> {
    const bodyObject = { ipn: code };

    global.log.save('user-find-by-code-request', bodyObject);
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.getUserByCode}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      body: JSON.stringify(bodyObject),
      timeout: this.timeout,
    });
    global.log.save('user-find-by-code-response', response);

    if (!Array.isArray(response)) {
      throw new Error(ERROR_MESSAGE_USER_NOT_RESPONSED);
    }

    const mainUsersInfo = response.map((user: any) => this.getMainUserInfo(user, withPrivateProps));
    const [mainUserInfo = null] = mainUsersInfo;
    const needsReturnArray = Array.isArray(code);
    const infoToReturn = needsReturnArray ? mainUsersInfo : mainUserInfo;

    return infoToReturn;
  }

  /**
   * Check email.
   * @param email Email to check.
   * @returns Is email exist indicator.
   */
  async checkEmail(email: string): Promise<boolean> {
    global.log.save('email-existance-request', email);
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.checkEmail}?email=${email}`,
      method: HttpRequest.Methods.GET,
      headers: {
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      timeout: this.timeout,
    });
    global.log.save('email-existance-response', response);

    if (typeof response !== 'object') {
      throw new Error(ERROR_MESSAGE_EMAIL_EXISTENCE_NOT_RESPONSED);
    }

    const isExist = !!response.isExist;
    return isExist;
  }

  /**
   * Get main user info.
   * @param user User object.
   * @param withPrivateProps With private properties.
   * @param myInfo My info indicator.
   * @returns User info.
   */
  getMainUserInfo(user: any, withPrivateProps = false, myInfo = false): UserInfo | undefined {
    if (!user) {
      return undefined;
    }

    const cyrillicTranslit = CyrillicToTranslit({ preset: 'uk' });
    const cyrillicIpn = cyrillicTranslit.reverse(user.ipn);
    user.cyrillicIpnPassport = cyrillicIpn;

    return {
      ...(withPrivateProps ? user : {}),
      userId: user.userId,
      address: user.address,
      addressStruct: user.addressStruct,
      name: user.isLegal ? user.companyName : `${user.last_name || ''} ${user.first_name || ''} ${user.middle_name || ''}`.trim(),
      ceoName: user.isLegal ? `${user.last_name || ''} ${user.first_name || ''} ${user.middle_name || ''}`.trim() : undefined,
      isLegal: user.isLegal,
      isIndividualEntrepreneur: user.isIndividualEntrepreneur,
      companyName: user.companyName,
      first_name: user.first_name,
      firstName: user.first_name,
      last_name: user.last_name,
      lastName: user.last_name,
      middle_name: user.middle_name,
      middleName: user.middle_name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      birthday: user.birthday,
      avaUrl: user.avaUrl ? `${this.server}:${this.port}${user.avaUrl}` : '',
      status: user.status,
      valid: user.valid,
      position: myInfo
        ? PropByPath.get(user, 'services.eds.data.title')
        : (user.user_services && user.user_services[0] && user.user_services[0].data && user.user_services[0].data.title) || undefined,
      pem: user.user_services && user.user_services[0] && user.user_services[0].data && user.user_services[0].data.pem,
      encodeCertSerial: user.user_services && user.user_services[0] && user.user_services[0].data && user.user_services[0].data.encodeCertSerial,
      encodeCert: user.user_services && user.user_services[0] && user.user_services[0].data && user.user_services[0].data.encodeCert,
      services: withPrivateProps
        ? user.services || {
            ldap: user.user_services && user.user_services[0] && user.user_services[0].provider === 'ldap' ? user.user_services[0] : undefined,
            eds: user.user_services && user.user_services[0] && user.user_services[0].provider === 'eds' ? user.user_services[0] : undefined,
            govid: user.user_services && user.user_services[0] && user.user_services[0].provider === 'govid' ? user.user_services[0] : undefined,
          }
        : undefined,
    } as UserInfo;
  }

  /**
   * Send sms for phone verification.
   * @param phone User phone.
   * @returns SMS send result.
   */
  async sendSms(phone: number): Promise<string> {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.sendSms}?phone=${phone}`,
      method: HttpRequest.Methods.GET,
      headers: { 'x-trace-id': getTraceId() },
      timeout: this.timeout,
    });

    global.log.save('user-send-sms', response);

    if (!response.sendBySms) {
      throw new Error(ERROR_MESSAGE_USER_SMS_NOT_RESPONSED);
    }

    return response.sendBySms;
  }

  /**
   * Verify phone.
   * @param phone User phone.
   * @param code Sms code.
   * @returns Is verified indicator.
   */
  async verifyPhone(phone: number, code: number): Promise<boolean> {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.verifyPhone}?phone=${phone}&code=${code}`,
      method: HttpRequest.Methods.GET,
      headers: { 'x-trace-id': getTraceId() },
      timeout: this.timeout,
    });

    global.log.save('user-phone-verification', response);

    if (response === SUCCESSFUL_SENT_SMS) {
      return true;
    }

    return false;
  }

  /**
   * Verify phone and set.
   * @param phone User phone.
   * @param code Sms code.
   * @param accessToken User access token.
   * @returns Phone verification result.
   */
  async verifyPhoneAndSet(phone: number, code: number, accessToken: string): Promise<any> {
    global.log.save('user-phone-verification-request', {
      phone,
      code,
      accessToken,
    });
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.verifyPhoneAndSet}?phone=${phone}&code=${code}&access_token=${accessToken}`,
      method: HttpRequest.Methods.POST,
      headers: { 'x-trace-id': getTraceId() },
      timeout: this.timeout,
    });
    global.log.save('user-phone-verification-response', {
      phone,
      code,
      accessToken,
      response,
    });

    return response;
  }

  /**
   * Check phone exist.
   * @param phone User phone.
   * @returns Phone existing info.
   */
  async checkPhoneExist(phone: number): Promise<{ isExist: boolean; isConfirmed: boolean }> {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.phoneExist}?phone=${phone}`,
      method: HttpRequest.Methods.GET,
      headers: { 'x-trace-id': getTraceId() },
      timeout: this.timeout,
    });

    global.log.save('user-phone-existing-verification', response);

    let isExist = false;
    let isConfirmed = false;
    if (response && response.text && response.text !== 'null') {
      isExist = true;
    }
    if (response && response.valid && response.valid.phone) {
      isConfirmed = true;
    }

    return { isExist, isConfirmed };
  }

  /**
   * Change email.
   * @param email User email.
   * @returns Result.
   */
  async changeEmail(email: string): Promise<any> {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.changeEmail}?email=${email}`,
      method: HttpRequest.Methods.GET,
      headers: { 'x-trace-id': getTraceId() },
      timeout: this.timeout,
    });

    global.log.save('user-change-email', response);

    if (typeof response === 'undefined') {
      throw new Error(ERROR_MESSAGE_USER_CHANGE_EMAIL_NOT_RESPONSED);
    }

    return response;
  }

  /**
   * Confirm change email.
   * @param email User email.
   * @param code User code.
   * @param accessToken User access token.
   * @returns Result.
   */
  async confirmChangeEmail(email: string, code: number, accessToken: string): Promise<any> {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.confirmChangeEmail}?email=${email}&code_email=${code}&access_token=${accessToken}`,
      method: HttpRequest.Methods.GET,
      headers: { 'x-trace-id': getTraceId() },
      timeout: this.timeout,
    });

    global.log.save('user-confirm-change-email', response);

    if (!response || !response.userId) {
      throw new Error(ERROR_MESSAGE_USER_CONFIRMATION_CHANGE_EMAIL_NOT_RESPONSED);
    }

    return response;
  }

  /**
   * Add test code.
   * @param code Code to initialize.
   * @param userId User ID to login with defined code.
   * @returns Is initialized indicator.
   */
  async addTestCode(code: string, userId: string): Promise<boolean> {
    global.log.save('add-test-code-request', { code, userId });
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.addTestCode}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      body: JSON.stringify({ code, userId }),
      timeout: this.timeout,
    });
    global.log.save('add-test-code-response', response);

    if (typeof response !== 'object') {
      throw new Error(ERROR_MESSAGE_WRONG_RESPONSE_FORMAT);
    }
    if (response.error) {
      throw new Error(response.error && response.error.message);
    }
    if (typeof response.data !== 'object') {
      throw new Error(ERROR_MESSAGE_WRONG_RESPONSE_DATA_FORMAT);
    }

    const isInitialized = response.data.code === code;
    return isInitialized;
  }

  /**
   * Send ping request.
   * @returns Ping response.
   */
  async sendPingRequest(): Promise<any> {
    const fullResponse = true;

    try {
      const { response, body } = await HttpRequest.send(
        {
          url: `${this.server}:${this.port}${this.routes.pingWithAuth}`,
          method: HttpRequest.Methods.GET,
          headers: {
            'x-trace-id': getTraceId(),
            Authorization: this.basicAuthHeader,
          },
          timeout: this.timeout,
        },
        fullResponse,
      );
      global.log.save('send-ping-request-to-liquio-id', {
        response: response.toString(),
        body,
      });

      const headers = response.headers;
      const version = headers && headers.version;
      const customer = headers && headers.customer;
      const environment = headers && headers.environment;

      return { version, customer, environment, body };
    } catch (error: any) {
      global.log.save('send-ping-request-to-liquio-id-error', error.message);
    }
  }

  /**
   * Logout other sessions.
   * @param userId User ID.
   * @param accessToken Access token.
   * @param refreshToken Refresh token.
   * @returns Is accepted indicator.
   */
  async logoutOtherSessions(userId: string, accessToken: string, refreshToken: string): Promise<boolean> {
    const bodyRequiredProperties = `MIME+Type=application%2Fx-www-form-urlencoded&userId=${userId}&access_token=${accessToken}&refresh_token=${refreshToken}`;
    const body = `${bodyRequiredProperties}`;

    global.log.save('logout-other-sessions-request', { body, userId });
    let response;
    const options = {
      url: `${this.server}:${this.port}${this.routes.logoutOtherSessions}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_FORM_URL_ENCODED,
        'x-trace-id': getTraceId(),
      },
      body,
      timeout: this.timeout,
    };
    global.log.save('logout-other-sessions-options', { options }, 'info');
    try {
      response = await HttpRequest.send(options);
    } catch (error: any) {
      global.log.save('logout-other-sessions-request-error', {
        error: error && error.message,
        body,
        userId,
      });
    }
    global.log.save('logout-other-sessions-response', { response, userId });

    const isAccepted = response && response.data && response.data.accepted;
    return isAccepted;
  }

  /**
   * Prepare user.
   * @param name First name.
   * @param surname Surname.
   * @param middleName Middle name.
   * @param ipn IPN.
   * @param email Email.
   * @returns Prepared user.
   */
  async prepareUser(name: string, surname: string, middleName: string, ipn: string, email: string): Promise<any> {
    const cyrillicTranslit = CyrillicToTranslit({ preset: 'uk' });
    const translitedIpn = cyrillicTranslit.transform(ipn);

    const bodyRequiredProperties = `MIME+Type=application%2Fx-www-form-urlencoded&name=${name}&surname=${surname}&middlename=${middleName}&ipn=${translitedIpn}&email=${email}`;
    const body = `${bodyRequiredProperties}`;

    global.log.save('prepare-user-request', { body }, 'info');
    let response;
    const options = {
      url: `${this.server}:${this.port}${this.routes.prepareUser}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_FORM_URL_ENCODED,
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      body,
      timeout: this.timeout,
    };
    global.log.save('prepare-user-options', { options }, 'info');
    try {
      response = await HttpRequest.send(options);
    } catch (error: any) {
      global.log.save('prepare-user-error', { error: error && error.message, body });
    }

    if (!response.userId) {
      global.log.save('prepare-user-response-error', { response }, 'error');
      return undefined;
    }
    global.log.save('prepare-user-response', { response }, 'info');

    return response;
  }

  /**
   * Change password.
   * @param email User email.
   * @param oldPassword Old password.
   * @param newPassword New password.
   * @returns Success indicator.
   */
  async changePassword(email: string, oldPassword: string, newPassword: string): Promise<any> {
    try {
      const options = {
        url: `${this.server}:${this.port}${this.routes.changePassword}`,
        method: HttpRequest.Methods.POST,
        headers: {
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          'x-trace-id': getTraceId(),
          Authorization: this.basicAuthHeader,
        },
        body: JSON.stringify({ email, oldPassword, newPassword }),
        timeout: this.timeout,
      };

      global.log.save('change-user-password-request', {
        ...options,
        headers: { ...options.headers, Authorization: 'Basic ***' },
      });

      const { success, error } = await HttpRequest.send(options);

      if (error) {
        global.log.save('change-user-password-error', error);
        return { success: false, error };
      }

      global.log.save('change-user-password-response', { success });

      return { success };
    } catch (error: any) {
      global.log.save('change-user-password-error', error.message);
      return { success: false };
    }
  }

  /**
   * Generate user TOTP.
   * @param userId User ID.
   * @returns TOTP generation result.
   */
  async generateUserTotp(userId: string): Promise<any> {
    try {
      const options = {
        url: `${this.server}:${this.port}${this.routes.generateUserTotp}?userId=${userId}`,
        method: HttpRequest.Methods.GET,
        headers: {
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          'x-trace-id': getTraceId(),
          Authorization: this.basicAuthHeader,
        },
        timeout: this.timeout,
      };

      global.log.save('generate-user-totp-request', {
        ...options,
        headers: { ...options.headers, Authorization: 'Basic ***' },
      });

      const { secret, uri, error } = await HttpRequest.send(options);

      if (error) {
        global.log.save('generate-user-totp-error', { error: error.message, stack: error.stack }, 'error');
        return { success: false };
      }

      global.log.save('generate-user-totp-response', {
        secret: secret && '***',
        uri: uri && uri.replace(secret, '***'),
      });

      return { success: true, secret, uri };
    } catch (error: any) {
      global.log.save('generate-user-totp-error', { error: error.message, stack: error.stack }, 'error');
      return { success: false };
    }
  }

  /**
   * Enable user TOTP secret.
   * @param userId User ID.
   * @param secret TOTP secret.
   * @param code TOTP code.
   * @returns Success indicator.
   */
  async enableUserTotpSecret(userId: string, secret: string, code: string): Promise<any> {
    try {
      const options = {
        url: `${this.server}:${this.port}${this.routes.enableUserTotpSecret}`,
        method: HttpRequest.Methods.POST,
        headers: {
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          'x-trace-id': getTraceId(),
          Authorization: this.basicAuthHeader,
        },
        body: JSON.stringify({ userId, secret, code }),
        timeout: this.timeout,
      };

      global.log.save('enable-user-totp-request', {
        ...options,
        headers: { ...options.headers, Authorization: 'Basic ***' },
      });

      const { success, error } = await HttpRequest.send(options);

      if (error) {
        global.log.save('enable-user-totp-error', error);
        return { success: false };
      }

      global.log.save('enable-user-totp-response', { success });

      return { success };
    } catch (error: any) {
      global.log.save('enable-user-totp-error', error.message);
      return { success: false };
    }
  }

  /**
   * Disable user TOTP secret.
   * @param userId User ID.
   * @param code TOTP code.
   * @returns Success indicator.
   */
  async disableUserTotpSecret(userId: string, code: string): Promise<any> {
    try {
      const options = {
        url: `${this.server}:${this.port}${this.routes.disableUserTotpSecret}`,
        method: HttpRequest.Methods.POST,
        headers: {
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          'x-trace-id': getTraceId(),
          Authorization: this.basicAuthHeader,
        },
        body: JSON.stringify({ userId, code }),
        timeout: this.timeout,
      };

      global.log.save('disable-user-totp-request', {
        ...options,
        headers: { ...options.headers, Authorization: 'Basic ***' },
      });

      const { success, error } = await HttpRequest.send(options);

      if (error) {
        global.log.save('disable-user-totp-error', error);
        return { success: false };
      }

      global.log.save('disable-user-totp-response', { success });

      return { success };
    } catch (error: any) {
      global.log.save('disable-user-totp-error', error.message);
      return { success: false };
    }
  }

  /**
   * Delete user.
   * @param userId User ID.
   * @returns Success indicator.
   */
  async deleteUser(userId: string): Promise<any> {
    if (!this.canDeleteUser) {
      return { success: false, message: 'Method is not allowed' };
    }

    try {
      const options = {
        url: `${this.server}:${this.port}${this.routes.deleteUser}`,
        method: HttpRequest.Methods.DELETE,
        headers: {
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          'x-trace-id': getTraceId(),
          Authorization: this.basicAuthHeader,
        },
        body: JSON.stringify({ userId }),
        timeout: this.timeout,
      };

      global.log.save('delete-user-request', {
        ...options,
        headers: { ...options.headers, Authorization: 'Basic ***' },
      });

      const { success, error } = await HttpRequest.send(options);

      if (error) {
        global.log.save('delete-user-error', error);
        return { success: false };
      }
      global.log.save('delete-user-response', { success });
      return { success };
    } catch (error: any) {
      global.log.save('delete-user-error', error.message);
      return { success: false };
    }
  }
}
