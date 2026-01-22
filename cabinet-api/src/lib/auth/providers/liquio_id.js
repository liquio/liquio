const cyrillicToTranslit = require('cyrillic-to-translit-js');
const PropByPath = require('prop-by-path');

const Provider = require('./provider');
const HttpRequest = require('../../http_request');
const { getTraceId } = require('../../async_local_storage');

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

class LiquioIdProvider extends Provider {
  /**
   * Constructor.
   * @param {object} authConfig Auth config object.
   */
  constructor(authConfig) {
    if (!LiquioIdProvider.singleton) {
      super();

      this.config = authConfig;
      this.server = authConfig.server;
      this.port = authConfig.port;
      this.routes = { ...DEFAULT_ROUTES, ...authConfig.routes };
      this.timeout = authConfig.timeout || 30000;
      this.clientId = authConfig.clientId;
      this.clientSecret = authConfig.clientSecret;
      this.basicAuthHeader = `Basic ${authConfig.basicAuthToken}`; // Header "Authorization".
      this.canDeleteUser = authConfig.canDeleteUser || false;
      LiquioIdProvider.singleton = this;
    }

    return LiquioIdProvider.singleton;
  }

  /**
   * Get provider name.
   * @returns {string}
   */
  static get name() {
    return 'LiquioId';
  }

  /**
   * Get tokens.
   * @param {string} code Auth code.
   * @returns {Promise<{accessToken: string, refreshToken: string}>}
   */
  async getTokens(code) {
    // Do request to get Liquio ID token.
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.getToken}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_FORM_URL_ENCODED,
        'x-trace-id': getTraceId(),
      },
      body: `grant_type=authorization_code&code=${code}&client_id=${this.clientId}&client_secret=${this.clientSecret}`,
    });

    // Check response.
    if (!response.access_token || !response.refresh_token) {
      log.save('login-error-id-response-without-tokens', response);
      throw new Error(ERROR_MESSAGE_TOKENS_NOT_RESPONSED);
    }

    // Return tokens.
    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    };
  }

  /**
   * Renew tokens.
   * @param {string} refreshToken Refresh token.
   * @returns {Promise<{accessToken: string, refreshToken: string}>}
   */
  async renewTokens(refreshToken) {
    // Do request to get Liquio ID token.
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.getToken}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_FORM_URL_ENCODED,
        'x-trace-id': getTraceId(),
      },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${this.clientId}&client_secret=${this.clientSecret}`,
    });

    // Check response.
    if (!response.access_token || !response.refresh_token) {
      throw new Error(ERROR_MESSAGE_TOKENS_NOT_RESPONSED);
    }

    // Return tokens.
    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    };
  }

  /**
   * Get user info.
   * @param {string} accessToken Liquio ID access token.
   * @returns {Promise<{userId: string; services: { eds: { data: { pem: string } } }}>}
   */
  async getUser(accessToken) {
    // Do request to get Liquio ID token.
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.getUserInfo}?access_token=${accessToken}`,
      method: HttpRequest.Methods.GET,
      headers: { 'x-trace-id': getTraceId() },
      timeout: this.timeout,
    });

    // Check response.
    if (!response.userId) {
      log.save('login-error-id-response-without-user-id', response, 'error');
      throw new Error(ERROR_MESSAGE_USER_ID_NOT_RESPONSED);
    }
    if (!response.services) {
      log.save('login-error-id-response-without-user-eds-pem', response);
      // throw new Error(ERROR_MESSAGE_USER_CERTIFICATE_PEM_NOT_RESPONSED);
    }

    // Return tokens.
    return response;
  }

  /**
   * Update user info.
   * @param {string} userId User ID.
   * @param {string} accessToken Liquio ID access token.
   * @param {object} options Update options.
   * @param {string} [options.firstName] First name.
   * @param {string} [options.lastName] Last name.
   * @param {string} [options.middleName] Middle name.
   * @param {string} [options.gender] Gender. Values: "male", "female".
   * @param {string} [options.birthday] Birthday. Value format: "DD/MM/YYYY".
   * @param {string} [options.email] Email.
   * @param {string} [options.phone] Phone.
   * @param {string} [options.useTwoFactorAuth] Use two factor auth indicator.
   * @param {string} [options.twoFactorType] Two factor auth type. Values: "phone", "totp".
   * @returns {Promise<boolean>} Is updated indicator propmise.
   */
  async updateUser(userId, accessToken, options = {}) {
    // Define request body.
    const bodyRequiredProperties = `MIME+Type=application%2Fx-www-form-urlencoded&userId=${userId}&access_token=${accessToken}`;
    const updatingParams = {
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
      .map((v) => `&${v[0]}=${encodeURIComponent(v[1])}`);
    const bodyUpdatingParams = bodyUpdatingParamsArray.join('');
    const body = `${bodyRequiredProperties}${bodyUpdatingParams}`;

    // Do request to update user info.
    log.save('user-info-updating-request', body);
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
    log.save('user-info-updating-response', response);

    // Return is update indicator.
    const isUpdated = response === USER_INFO_UPDATED_RESPONSE;
    return isUpdated;
  }

  /**
   * Get user by ID or IDs.
   * @param {string|string[]} usersIds User ID or IDs list.
   * @param {boolean} [withPrivateProps] With private properties.
   * @returns {Promise<{}[]>} Users info promise.
   */
  async getUsersByIds(usersIds, withPrivateProps = false) {
    const normalizedUserIds = (Array.isArray(usersIds) ? usersIds : [usersIds]).filter((v) => typeof v === 'string' && v.length === 24);

    // Check if empty.
    if (normalizedUserIds.length === 0) {
      return [];
    }

    // Define request body.
    const bodyObject = { id: normalizedUserIds };

    // Do request to search users.
    log.save('get-user-by-id-request', bodyObject);
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
    log.save('get-user-by-id-response', { usersIds, normalizedUserIds, response });

    // Check response.
    if (!Array.isArray(response)) {
      throw new Error(ERROR_MESSAGE_USER_NOT_RESPONSED);
    }

    return response.map((user) => this.getMainUserInfo(user, withPrivateProps));
  }

  /**
   * Update user onboarding.
   * @param {string} userId User ID.
   * @param {object} params Params.
   * @param {string} params.onboardingTaskId OnboardingTaskId.
   * @param {boolean} params.needOnboarding NeedOnboarding.
   */
  async updateUserOnboarding(userId, { onboardingTaskId, needOnboarding }) {
    // Define request body.
    const bodyObject = { userId, onboardingTaskId, needOnboarding };

    // Do request to search users.
    log.save('update-user-onboarding-request', bodyObject);
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.updateUserOnboarding}`,
      method: HttpRequest.Methods.PUT,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      json: true,
      body: bodyObject,
      timeout: this.timeout,
    });

    log.save('update-user-onboarding-response', response);
  }

  /**
   * Search users.
   * @param {string} searchString Search string.
   * @returns {Promise<{}[]>}
   */
  async searchUsers(searchString) {
    // Define request body.
    const bodyObject = { searchString, limit: SEARCH_USERS_LIMIT };

    // Do request to search users.
    log.save('user-searching-request', bodyObject);
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
    log.save('user-searching-response', response);

    // Check response.
    if (!Array.isArray(response)) {
      throw new Error(ERROR_MESSAGE_USERS_LIST_NOT_RESPONSED);
    }

    const mainUsersInfo = response.map(this.getMainUserInfo.bind(this));

    // Return main users info.
    return mainUsersInfo;
  }

  /**
   * Get user by code.
   * @param {number} code Code.
   * @param {boolean} [withPrivateProps] With private properties.
   * @returns {Promise<object>} User or users info promise.
   */
  async getUserByCode(code, withPrivateProps = false) {
    // Define request body.
    const bodyObject = { ipn: code };

    // Do request to search users.
    log.save('user-find-by-code-request', bodyObject);
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
    log.save('user-find-by-code-response', response);

    // Check response.
    if (!Array.isArray(response)) {
      throw new Error(ERROR_MESSAGE_USER_NOT_RESPONSED);
    }

    // Prepare data to return. Needs to return array if input IPN is array too.
    const mainUsersInfo = response.map((user) => this.getMainUserInfo(user, withPrivateProps));
    const [mainUserInfo = null] = mainUsersInfo;
    const needsReturnArray = Array.isArray(code);
    const infoToReturn = needsReturnArray ? mainUsersInfo : mainUserInfo;

    // Return main user or users info.
    return infoToReturn;
  }

  /**
   * Check email.
   * @param {string} email Email to check.
   * @returns {boolean} Is email exist indicator.
   */
  async checkEmail(email) {
    // Do request to check email existence.
    log.save('email-existance-request', email);
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.checkEmail}?email=${email}`,
      method: HttpRequest.Methods.GET,
      headers: {
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      timeout: this.timeout,
    });
    log.save('email-existance-response', response);

    // Check response.
    if (typeof response !== 'object') {
      throw new Error(ERROR_MESSAGE_EMAIL_EXISTENCE_NOT_RESPONSED);
    }

    // Response existence.
    const isExist = !!response.isExist;
    return isExist;
  }

  /**
   * Get main user info.
   * @param {object} user User object.
   * @param {boolean} [withPrivateProps] With private properties.
   * @param {boolean} [myInfo] My info indicator.
   */
  getMainUserInfo(user, withPrivateProps = false, myInfo = false) {
    // Check.
    if (!user) {
      return;
    }

    const cyrillicIpn = cyrillicToTranslit({ preset: 'uk' }).reverse(user.ipn);
    user.cyrillicIpnPassport = cyrillicIpn;

    // Define and return.
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
    };
  }

  /**
   * Send sms for phone verification.
   * @param {number} phone User phone.
   * @returns {string}
   */
  async sendSms(phone) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.sendSms}?phone=${phone}`,
      method: HttpRequest.Methods.GET,
      headers: { 'x-trace-id': getTraceId() },
      timeout: this.timeout,
    });

    log.save('user-send-sms', response);

    // Check response.
    if (!response.sendBySms) {
      throw new Error(ERROR_MESSAGE_USER_SMS_NOT_RESPONSED);
    }

    return response.sendBySms;
  }

  /**
   * Verify phone.
   * @param {number} phone User phone.
   * @param {number} code Sms code.
   * @returns {boolean}
   */
  async verifyPhone(phone, code) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.verifyPhone}?phone=${phone}&code=${code}`,
      method: HttpRequest.Methods.GET,
      headers: { 'x-trace-id': getTraceId() },
      timeout: this.timeout,
    });

    log.save('user-phone-verification', response);

    if (response === SUCCESSFUL_SENT_SMS) {
      return true;
    }

    return false;
  }

  /**
   * Verify phone and set.
   * @param {number} phone User phone.
   * @param {number} code Sms code.
   * @param {string} accessToken User access token.
   * @returns {Promise<{data: {isConfirmed: boolean, user?: object}}|{error: {message: string, type: string}}}>} Phone verification result promise.
   */
  async verifyPhoneAndSet(phone, code, accessToken) {
    // Request phone verification.
    log.save('user-phone-verification-request', { phone, code, accessToken });
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.verifyPhoneAndSet}?phone=${phone}&code=${code}&access_token=${accessToken}`,
      method: HttpRequest.Methods.POST,
      headers: { 'x-trace-id': getTraceId() },
      timeout: this.timeout,
    });
    log.save('user-phone-verification-response', { phone, code, accessToken, response });

    // Return Liquio ID response as is.
    return response;
  }

  /**
   * Check phone exist.
   * @param {number} phone User phone.
   * @returns {Promise<{isExist: boolean, isConfirmed: boolean}>} Phone existing info promise.
   */
  async checkPhoneExist(phone) {
    // Do request.
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.phoneExist}?phone=${phone}`,
      method: HttpRequest.Methods.GET,
      headers: { 'x-trace-id': getTraceId() },
      timeout: this.timeout,
    });

    // Log result.
    log.save('user-phone-existing-verification', response);

    // Check result, define and return info.
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
   * @param {string} email User email.
   * @returns {string}
   */
  async changeEmail(email) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.changeEmail}?email=${email}`,
      method: HttpRequest.Methods.GET,
      headers: { 'x-trace-id': getTraceId() },
      timeout: this.timeout,
    });

    log.save('user-change-email', response);

    // Check response.
    if (typeof response === 'undefined') {
      throw new Error(ERROR_MESSAGE_USER_CHANGE_EMAIL_NOT_RESPONSED);
    }

    return response;
  }

  /**
   * Confirm change email.
   * @param {string} email User email.
   * @param {number} code User code.
   * @param {string} accessToken User access token.
   * @returns {string}
   */
  async confirmChangeEmail(email, code, accessToken) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.confirmChangeEmail}?email=${email}&code_email=${code}&access_token=${accessToken}`,
      method: HttpRequest.Methods.GET,
      headers: { 'x-trace-id': getTraceId() },
      timeout: this.timeout,
    });

    log.save('user-confirm-change-email', response);

    // Check response.
    if (!response || !response.userId) {
      throw new Error(ERROR_MESSAGE_USER_CONFIRMATION_CHANGE_EMAIL_NOT_RESPONSED);
    }

    return response;
  }

  /**
   * Add test code.
   * @param {string} code Code to initialize.
   * @param {string} userId User ID to login with defined code.
   * @returns {Promise<boolean>} Is initialized indicator promise.
   */
  async addTestCode(code, userId) {
    // Do request to check email existence.
    log.save('add-test-code-request', { code, userId });
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
    log.save('add-test-code-response', response);

    // Check response.
    if (typeof response !== 'object') {
      throw new Error(ERROR_MESSAGE_WRONG_RESPONSE_FORMAT);
    }
    if (response.error) {
      throw new Error(response.error && response.error.message);
    }
    if (typeof response.data !== 'object') {
      throw new Error(ERROR_MESSAGE_WRONG_RESPONSE_DATA_FORMAT);
    }

    // Response is initialized indicator.
    const isInitialized = response.data.code === code;
    return isInitialized;
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest() {
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
      log.save('send-ping-request-to-liquio-id', { response: response.toString(), body });

      const headers = response.headers;
      const version = headers && headers.version;
      const customer = headers && headers.customer;
      const environment = headers && headers.environment;

      return { version, customer, environment, body };
    } catch (error) {
      log.save('send-ping-request-to-liquio-id-error', error.message);
    }
  }

  /**
   * Logout other sessions.
   * @param {string} userId User ID.
   * @param {string} accessToken Access token.
   * @param {string} refreshToken Refresh token.
   * @returns {Promise<boolean>} Is accepted indicator promise.
   */
  async logoutOtherSessions(userId, accessToken, refreshToken) {
    // Define request body.
    const bodyRequiredProperties = `MIME+Type=application%2Fx-www-form-urlencoded&userId=${userId}&access_token=${accessToken}&refresh_token=${refreshToken}`;
    const body = `${bodyRequiredProperties}`;

    // Do request to logout other sessions.
    log.save('logout-other-sessions-request', { body, userId });
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
    log.save('logout-other-sessions-options', { options }, 'info');
    try {
      response = await HttpRequest.send(options);
    } catch (error) {
      log.save('logout-other-sessions-request-error', { error: error && error.message, body, userId });
    }
    log.save('logout-other-sessions-response', { response, userId });

    // Return is update indicator.
    const isAccepted = response && response.data && response.data.accepted;
    return isAccepted;
  }

  /**
   * Prepare user.
   * @param {string} name First name.
   * @param {string} surname Surname.
   * @param {string} middleName Middle name.
   * @param {string} ipn IPN.
   * @param {string} email Email.
   */
  async prepareUser(name, surname, middlename, ipn, email) {
    // Transliterate ipn.
    const translitedIpn = cyrillicToTranslit({ preset: 'uk' }).transform(ipn);

    // Define request body.
    const bodyRequiredProperties = `MIME+Type=application%2Fx-www-form-urlencoded&name=${name}&surname=${surname}&middlename=${middlename}&ipn=${translitedIpn}&email=${email}`;
    const body = `${bodyRequiredProperties}`;

    // Do request.
    log.save('prepare-user-request', { body }, 'info');
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
    log.save('prepare-user-options', { options }, 'info');
    try {
      response = await HttpRequest.send(options);
    } catch (error) {
      log.save('prepare-user-error', { error: error && error.message, body });
    }

    // Check response.
    if (!response.userId) {
      log.save('prepare-user-response-error', { response }, 'error');
      return undefined;
    }
    log.save('prepare-user-response', { response }, 'info');

    return response;
  }

  async changePassword(email, oldPassword, newPassword) {
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

      log.save('change-user-password-request', { ...options, headers: { ...options.headers, Authorization: 'Basic ***' } });

      const { success, error } = await HttpRequest.send(options);

      if (error) {
        log.save('change-user-password-error', error);
        return { success: false, error };
      }

      log.save('change-user-password-response', { success });

      return { success };
    } catch (error) {
      log.save('change-user-password-error', error.message);
      return { success: false };
    }
  }

  async generateUserTotp(userId) {
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

      log.save('generate-user-totp-request', { ...options, headers: { ...options.headers, Authorization: 'Basic ***' } });

      const { secret, uri, error } = await HttpRequest.send(options);

      if (error) {
        log.save('generate-user-totp-error', { error: error.message, stack: error.stack }, 'error');
        return { success: false };
      }

      log.save('generate-user-totp-response', { secret: secret && '***', uri: uri && uri.replace(secret, '***') });

      return { success: true, secret, uri };
    } catch (error) {
      log.save('generate-user-totp-error', { error: error.message, stack: error.stack }, 'error');
      return { success: false };
    }
  }

  async enableUserTotpSecret(userId, secret, code) {
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

      log.save('enable-user-totp-request', { ...options, headers: { ...options.headers, Authorization: 'Basic ***' } });

      const { success, error } = await HttpRequest.send(options);

      if (error) {
        log.save('enable-user-totp-error', error);
        return { success: false };
      }

      log.save('enable-user-totp-response', { success });

      return { success };
    } catch (error) {
      log.save('enable-user-totp-error', error.message);
      return { success: false };
    }
  }

  async disableUserTotpSecret(userId, code) {
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

      log.save('disable-user-totp-request', { ...options, headers: { ...options.headers, Authorization: 'Basic ***' } });

      const { success, error } = await HttpRequest.send(options);

      if (error) {
        log.save('disable-user-totp-error', error);
        return { success: false };
      }

      log.save('disable-user-totp-response', { success });

      return { success };
    } catch (error) {
      log.save('disable-user-totp-error', error.message);
      return { success: false };
    }
  }

  async deleteUser(userId) {
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

      log.save('delete-user-request', { ...options, headers: { ...options.headers, Authorization: 'Basic ***' } });

      const { success, error } = await HttpRequest.send(options);

      if (error) {
        log.save('delete-user-error', error);
        return { success: false };
      }
      log.save('delete-user-response', { success });
      return { success };
    } catch (error) {
      log.save('delete-user-error', error.message);
      return { success: false };
    }
  }
}

module.exports = LiquioIdProvider;
