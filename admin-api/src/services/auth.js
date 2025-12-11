const qs = require('qs');
const PropByPath = require('prop-by-path');
const querystring = require('querystring');
const _ = require('lodash');
const moment = require('moment');

const HttpRequest = require('../lib/http_request');
const { getTraceId } = require('../lib/async_local_storage');

// Constants.
const DEFAULT_ROUTES = {
  getCode: '/authorise',
  getToken: '/oauth/token/',
  getUsers: '/user',
  findByUserId: '/user',
  updateByUserId: '/user/info',
  deleteByUserId: '/user',
  logoutByUserId: '/user/:id/logout',
  getUserInfo: '/user/info',
  getUserInfoById: '/user/info/id',
  searchUsers: '/user/info/search',
  findUserByCode: '/user/info/ipn',
  getLoginHistory: '/login_history',
  getUserAdminActions: '/user_admin_actions',
  pingWithAuth: '/test/ping_with_auth',
  getUserStat: '/stat',
  setPassword: '/user/password/set',
  createLocalUser: '/user/create_local',
};
const SEARCH_USERS_LIMIT = 10;
const ERROR_MESSAGE_TOKENS_NOT_RESPONSED = 'Access or refresh tokens not responsed from auth server.';
const ERROR_MESSAGE_USER_ID_NOT_RESPONSED = 'User ID not responsed from auth server.';
const ERROR_MESSAGE_USER_NOT_RESPONSED = 'User not responsed from auth server.';
const ERROR_MESSAGE_USERS_LIST_NOT_RESPONSED = 'Users list not responsed from auth server.';
const ERROR_MESSAGE_LOGIN_HISTORY_NOT_RESPONSED = 'Login history not responsed from auth server.';
const ERROR_MESSAGE_USER_ADMIN_ACTIONS_NOT_RESPONSED = 'User admin actions not responsed from auth server.';

class AuthService {
  /**
   * Constructor.
   * @param {object} authConfig Auth config object.
   */
  constructor(authConfig) {
    if (!AuthService.singleton) {
      this.config = authConfig;
      this.server = authConfig.server || 'http://id-api';
      this.port = authConfig.port || 8100;
      this.routes = { ...DEFAULT_ROUTES };
      this.timeout = authConfig.timeout || 30000;
      this.clientId = authConfig.clientId || 'admin-api';
      this.clientSecret = authConfig.clientSecret;
      this.basicAuthHeader = `Basic ${authConfig.basicAuthToken}`; // Header "Authorization".
      AuthService.singleton = this;
    }

    return AuthService.singleton;
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
      timeout: this.timeout,
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
      timeout: this.timeout,
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
   * Get users.
   * @param {object} params Params.
   * @returns {Promise<object[]>}
   */
  async getUsers({ id, email, phone, search, ipn, role, offset, limit }) {
    const query = querystring.stringify({ id, email, phone, search, ipn, role, offset, limit });

    const { response, body } = await HttpRequest.send(
      {
        url: `${this.server}:${this.port}${this.routes.getUsers}?${query}`,
        method: HttpRequest.Methods.GET,
        headers: {
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          'x-trace-id': getTraceId(),
          Authorization: this.basicAuthHeader,
        },
        timeout: this.timeout,
      },
      true,
    );

    return { response, body };
  }

  /**
   * Find by user ID.
   * @param {string} id ID.
   * @returns {Promise<object>}
   */
  async findByUserId(id) {
    if (typeof id !== 'string') {
      return;
    }
    try {
      log.save('id-request-find-by-user-id', id);

      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${this.routes.findByUserId}/${id}`,
        method: HttpRequest.Methods.GET,
        headers: {
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          'x-trace-id': getTraceId(),
          Authorization: this.basicAuthHeader,
        },
        timeout: this.timeout,
      });

      if (response) {
        response.name = this.concatUserName(response);
      }

      return response;
    } catch (error) {
      log.save('id-request-find-by-user-id-error', { id, error: error.message });
    }
  }

  /**
   * Find user by ID with cache.
   * @param {string} userId User ID.
   * @param {object[]} cachedUsers Cached users.
   */
  async findUserByIdWithCache(userId, cachedUsers = []) {
    let user = cachedUsers.find((v) => v.userId === userId);
    if (user) {
      return user;
    }

    user = await this.findByUserId(userId);
    if (user) {
      cachedUsers.push(user);
      return user;
    }
  }

  /**
   * Get users by IDs with cache.
   * @param {string[]} userIds User IDs.
   * @param {object[]} cachedUsers Cached users.
   */
  async getUsersByIdsWithCache(userIds, cachedUsers = []) {
    userIds = _.uniq(userIds);
    const notFoundUserIdsInCache = userIds.filter((userId) => !cachedUsers.some((v) => v.userId === userId));

    if (notFoundUserIdsInCache.length === 0) {
      return cachedUsers;
    }

    const foundUsers = await this.getUsersByIds(notFoundUserIdsInCache);

    return cachedUsers.concat(foundUsers);
  }

  /**
   * Update by user ID.
   * @param {number} id ID.
   * @returns {Promise<object>}
   */
  async updateByUserId(id, data, initiator) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.updateByUserId}/${id}`,
      method: HttpRequest.Methods.PUT,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      json: true,
      body: { ...data, updateInitiator: initiator },
      timeout: this.timeout,
    });

    return response;
  }

  /**
   * Delete user.
   * @param {string} userId User ID.
   * @returns {Promise<object>}
   */
  async deleteUser(userId) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.deleteByUserId}`,
      method: HttpRequest.Methods.DELETE,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      json: true,
      body: { userId },
      timeout: this.timeout,
    });

    return response;
  }

  /**
   * Logout by user ID.
   * @param {number} id ID.
   * @returns {Promise<object>}
   */
  async logoutByUserId(id) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.logoutByUserId.replace(':id', id)}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      timeout: this.timeout,
    });

    return response;
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
      log.save('login-error-id-response-without-user-id', response);
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

    // Define and return.
    return {
      ...(withPrivateProps ? user : {}),
      userId: user.userId,
      address: user.address,
      addressStruct: user.addressStruct,
      name: `${user.last_name || ''} ${user.first_name || ''} ${user.middle_name || ''}`.trim(),
      ceoName: user.isLegal ? this.concatUserName(user) : undefined,
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
      ipn: user.ipn,
      edrpou: user.edrpou,
      gender: user.gender,
      birthday: user.birthday,
      status: user.status,
      valid: user.valid,
      position: myInfo
        ? PropByPath.get(user, 'services.eds.data.title')
        : (user.user_services && user.user_services[0] && user.user_services[0].data && user.user_services[0].data.title) || undefined,
      pem: user.user_services && user.user_services[0] && user.user_services[0].data && user.user_services[0].data.pem,
      encodeCertSerial: user.user_services && user.user_services[0] && user.user_services[0].data && user.user_services[0].data.encodeCertSerial,
      encodeCert: user.user_services && user.user_services[0] && user.user_services[0].data && user.user_services[0].data.encodeCert,
    };
  }

  /**
   * Get user by ID or IDs.
   * @param {string|string[]} usersIds User ID or IDs list.
   * @param {boolean} [withPrivateProps] With private properties.
   * @returns {Promise<{}[]>}
   */
  async getUsersByIds(usersIds, withPrivateProps = false, briefInfo = false) {
    usersIds = usersIds.filter((user) => typeof user === 'string');
    // Define request body.
    const bodyObject = { id: usersIds };

    // Do request to search users.
    log.save('id-request-get-users-by-ids', bodyObject);
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.getUserInfoById}?brief_info=${briefInfo}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      body: JSON.stringify(bodyObject),
      timeout: this.timeout,
    });
    log.save('get-user-by-id-response', response);

    // Check response.
    if (!Array.isArray(response)) {
      throw new Error(ERROR_MESSAGE_USER_NOT_RESPONSED);
    }

    const mainUsersInfo = response.map((user) => this.getMainUserInfo(user, withPrivateProps));

    // Return main users info.
    return mainUsersInfo;
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
   * Find user by code.
   * @param {string} code Code.
   * @returns {Promise<object>}
   */
  async findUserByCode(code) {
    // Define request body.
    const bodyObject = { ipn: code };

    // Do request to search users.
    log.save('user-find-by-code-request', bodyObject);
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.findUserByCode}`,
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
    if (response.length === 0) {
      return null;
    }

    const mainUserInfo = this.getMainUserInfo(response[0]);

    // Return main user info.
    return mainUserInfo;
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest() {
    const fullResponse = true;

    try {
      let responseData = await HttpRequest.send(
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
      log.save('send-ping-request-to-liquio-id', responseData.response);
      const version = responseData && responseData.response && responseData.response.headers && responseData.response.headers.version;
      const customer = responseData && responseData.response && responseData.response.headers && responseData.response.headers.customer;
      const environment = responseData && responseData.response && responseData.response.headers && responseData.response.headers.environment;
      const body = responseData && responseData.response && JSON.parse(responseData.response.body || '{}');

      return { version, customer, environment, body };
    } catch (error) {
      log.save('send-ping-request-to-liquio-id-error', error.message);
    }
  }

  /**
   * Get login history.
   * @param {{offset, limit, filter}} options Options.
   * @returns {Promise<{data: LoginHistoryEntity[], meta: {count: number, offset: number, limit: number}}>} Login history.
   */
  async getLoginHistory({ offset = 0, limit = 10, filter = {} }) {
    // Define params.
    const query = qs.stringify({ offset, limit, filter });

    // Do request to get login history.
    log.save('get-login-history-request', { offset, limit, filter, query });
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.getLoginHistory}?${query}`,
      method: HttpRequest.Methods.GET,
      headers: {
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      timeout: this.timeout,
    });
    log.save('get-login-history-response', response);

    // Check response.
    if (!Array.isArray(response && response.data)) {
      throw new Error(ERROR_MESSAGE_LOGIN_HISTORY_NOT_RESPONSED);
    }

    // Prepare and response login history.
    const data = response.data.map((v) => new LoginHistoryEntity(v));
    const meta = response.meta;
    return { data, meta };
  }

  /**
   * Get user admin actions.
   * @param {{offset, limit, filter}} options Options.
   * @returns {Promise<{data: UserAdminActionEntity[], meta: {count: number, offset: number, limit: number}}>} User Admin Action.
   */
  async getUserAdminActions({ offset = 0, limit = 10, filter = {} }) {
    // Define params.
    const query = qs.stringify({ offset, limit, filter });

    // Do request to get user admin actions.
    log.save('get-user-admin-actions-request', { offset, limit, filter, query });
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.getUserAdminActions}?${query}`,
      method: HttpRequest.Methods.GET,
      headers: {
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      timeout: this.timeout,
    });
    log.save('get-user-admin-actions-response', response);

    // Check response.
    if (!Array.isArray(response && response.data)) {
      throw new Error(ERROR_MESSAGE_USER_ADMIN_ACTIONS_NOT_RESPONSED);
    }

    // Prepare and response user admin actions.
    const data = response.data.map((v) => new UserAdminActionEntity(v));
    const meta = response.meta;
    return { data, meta };
  }

  /**
   * Get users stat
   * @param {date} string Date YYYY-MM-DD format.
   * @returns {Promise<{ new_users: number, on_board_users: number, login_count: number }}>} Login history.
   */
  async getUserStatByDate({ date }) {
    log.save('get-user-stat-by-date-request', { date });

    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.getUserStat}/${date}`,
      method: HttpRequest.Methods.GET,
      headers: {
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      timeout: this.timeout,
    });
    log.save('get-login-history-response', response);

    // Check response.
    if (typeof response?.new_users === 'undefined') {
      throw new Error(ERROR_MESSAGE_LOGIN_HISTORY_NOT_RESPONSED);
    }

    return response;
  }
  /**
   * Get users stat
   * @param {from} string Date YYYY-MM-DD format.
   * @param {to} string Date YYYY-MM-DD format.
   * @returns {Promise<{ new_users: number, on_board_users: number, login_count: number }}>} Login history.
   */
  async getUserStatByPeriod({ from, to }) {
    log.save('get-user-stat-by-period-request', { from, to });
    if (new Date(from) > new Date(to)) {
      throw new Error('Option \'from\' must be less than option \'to\'');
    }
    const datesInPeriod = this.getDatesBetweenTwoDates(from, to);
    const _self = this;
    const promises = datesInPeriod.map((date) => _self.getUserStatByDate({ date }));
    const getUserStatByDateResult = await Promise.all(promises);

    return getUserStatByDateResult.reduce(
      ({ new_users, on_board_users, login_count }, el) => ({
        new_users: Number(new_users) + Number(el.new_users || 0),
        on_board_users: Number(on_board_users) + Number(el.on_board_users || 0),
        login_count: Number(login_count) + Number(el.login_count || 0),
      }),
      {
        new_users: 0,
        on_board_users: 0,
        login_count: 0,
      },
    );
  }

  async setUserPassword({ id, password }) {
    log.save('set-user-password', { id, password: '***' });

    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${this.routes.setPassword}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        Authorization: this.basicAuthHeader,
      },
      body: JSON.stringify({ userId: id, password }),
      timeout: this.timeout,
    });

    log.save('set-user-password', response);

    return response;
  }

  /**
   * Create a user with local authorization type.
   * @param {object} options User options.
   * @param {string} options.email User email.
   * @param {string} options.password User password.
   * @param {string} options.firstName User first name.
   * @param {string} [options.middleName] User middle name.
   * @param {string} options.lastName User last name.
   * @param {boolean} [options.needOnboarding] Need onboarding indicator (will be environment default if not set).
   * @param {string} [options.onboardingTaskId] Onboarding task ID (will be environment default if not set).
   * @throws {Error} Error.
   */
  async createLocalUser(options) {
    try {
      log.save('create-local-user-options', { ...options, password: '***' });

      const requestOptions = {
        method: HttpRequest.Methods.POST,
        url: `${this.server}:${this.port}${this.routes.createLocalUser}`,
        headers: {
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          'x-trace-id': getTraceId(),
          Authorization: this.basicAuthHeader,
        },
        body: JSON.stringify(options),
        timeout: this.timeout,
      };

      log.save('create-local-user-request', {
        ...requestOptions,
        body: requestOptions.body.replace(/"password":"[^"]+"/, '"password":"***"'),
        headers: { ...requestOptions.headers, Authorization: '***' },
      });

      return await HttpRequest.send(requestOptions);
    } catch (error) {
      log.save('create-local-user-error', { error: error.message });
      throw error;
    }
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

  /**
   * Concat userName.
   * @param {object} user User.
   */
  concatUserName(user) {
    return `${user.last_name || ''} ${user.first_name || ''} ${user.middle_name || ''}`.trim();
  }

  /**
   * Prepare short info about user.
   * @param {object} user User.
   * @returns {object}
   */
  prepareUserInfoFromId(user) {
    return { userId: user.userId, name: user.name, ipn: user.ipn };
  }

  /**
   * Get dates between two dates.
   * @param {string} from String date from, format YYYY-MM-DD.
   * @param {string} to String date to, format YYYY-MM-DD.
   * @returns {[string]} Array of strings date, example ['2023-09-01', '2023-09-02', ..., '2023-09-30']
   */
  getDatesBetweenTwoDates(from, to) {
    const fromDate = moment(from);
    const toDate = moment(to);
    const dates = [];

    while (fromDate.isSameOrBefore(toDate)) {
      dates.push(fromDate.format('YYYY-MM-DD'));
      fromDate.add(1, 'days');
    }
    return dates;
  }
}

/**
 * Login history entity.
 */
class LoginHistoryEntity {
  /**
   * Login history entity constructor.
   * @param {id, created_at, user_id, user_name, ip, user_agent, client_id, client_name, is_blocked, action_type} rawParams RAW params.
   */
  constructor({ id, created_at, user_id, user_name, ip, user_agent, client_id, client_name, is_blocked, action_type, expires_at }) {
    this.id = id;
    this.createdAt = created_at;
    this.userId = user_id;
    this.userName = user_name;
    this.ip = ip;
    this.userAgent = user_agent;
    this.clientId = client_id;
    this.clientName = client_name;
    this.isBlocked = is_blocked;
    this.actionType = action_type;
    this.expiresAt = expires_at;
  }
}

class UserAdminActionEntity {
  /**
   * User admin action entity constructor.
   * @param {id, user_id, data, created_by, created_at, action_type} rawParams RAW params.
   */
  constructor({ id, data, created_by, created_at, action_type }) {
    this.id = id;
    (this.user = {
      id: data.userId,
      lastName: data.last_name,
      firstName: data.first_name,
      middleName: data.middle_name,
      ipn: data.ipn,
      email: data.email,
    }),
    (this.createdBy = created_by);
    this.createdAt = created_at;
    this.actionType = action_type;
  }
}

module.exports = AuthService;
