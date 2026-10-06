import _ from 'lodash';

import { IdApiError, IdApiErrorMessage } from './errors';
import {
  IdApiConfig,
  IdApiCreateLocalUserOptions,
  IdApiGetUsersByIdsOptions,
  IdApiHttpResult,
  IdApiLog,
  IdApiLoginHistoryEntry,
  IdApiPagedResult,
  IdApiPaging,
  IdApiPhoneExistence,
  IdApiPingResult,
  IdApiPrepareUserParams,
  IdApiRoutes,
  IdApiSuccessResult,
  IdApiTokens,
  IdApiUpdateUserOptions,
  IdApiUser,
  IdApiUserAdminAction,
  IdApiUserBrief,
  IdApiUserInfo,
  IdApiUserLookupOptions,
  IdApiUsersQuery,
  IdApiUserStat,
} from './types';
import { getTraceId } from '../common/async_local_storage';

// Constants.
const DEFAULT_SERVER = 'http://id-api';
const DEFAULT_PORT = 8100;
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_SEARCH_USERS_LIMIT = 10;
const USER_ID_LENGTH = 24;
const ABSOLUTE_URL_REGEXP = /^[a-z][a-z\d+.-]*:\/\//i;
const USER_INFO_UPDATED_RESPONSE = 'ok';
const SUCCESSFUL_SENT_SMS = 'confirm';
const CONTENT_TYPE_JSON = 'application/json';
const CONTENT_TYPE_FORM_URL_ENCODED = 'application/x-www-form-urlencoded';

/** Default id-api routes. */
export const ID_API_DEFAULT_ROUTES: IdApiRoutes = {
  getToken: '/oauth/token/',
  getUsers: '/user',
  findUserById: '/user',
  getUserInfo: '/user/info',
  getUserInfoById: '/user/info/id',
  getUserInfoByPhone: '/user/info/phone',
  searchUsers: '/user/info/search',
  getUserByCode: '/user/info/ipn',
  getUserByEdrpou: '/user/info/edrpou',
  updateUserInfo: '/user/info',
  updateUserById: '/user/info',
  updateUserOnboarding: '/user/info/onboarding',
  deleteUser: '/user',
  logoutByUserId: '/user/:id/logout',
  logoutOtherSessions: '/user/logout_other_sessions',
  prepareUser: '/user/prepare',
  createLocalUser: '/user/create_local',
  setPassword: '/user/password/set',
  changePassword: '/authorise/local/change_password',
  sendSms: '/sign_up/confirmation/phone/send',
  verifyPhone: '/sign_up/confirmation/phone/verify',
  verifyPhoneAndSet: '/sign_up/confirmation/phone/verify',
  phoneExist: '/sign_up/confirmation/phone/exist',
  changeEmail: '/user/info/email/send',
  confirmChangeEmail: '/user/info/email/set',
  checkEmailConfirmationCode: '/user/info/email/check_email_confirmation_code',
  checkEmail: '/user/info/email/check',
  addTestCode: '/oauth/token/test_code',
  pingWithAuth: '/test/ping_with_auth',
  generateUserTotp: '/totp/generate',
  enableUserTotpSecret: '/totp/enable',
  disableUserTotpSecret: '/totp/disable',
  ldapGroupsExist: '/ldap/groups/exists',
  getLoginHistory: '/login_history',
  getUserAdminActions: '/user_admin_actions',
  getUserStat: '/stat',
};

type QueryValue = string | number | boolean | null | undefined | Record<string, unknown> | unknown[];

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  route: string;
  query?: Record<string, QueryValue>;
  json?: unknown;
  form?: Record<string, string | undefined>;
  basicAuth?: boolean;
}

/**
 * Framework-agnostic HTTP client for the id-api service (OAuth code/token, user info, user search,
 * login history, LDAP groups, etc.).
 *
 * Consolidates the near-identical id-api clients previously duplicated across the admin-api,
 * cabinet-api, task, event and notification components. Instance-based rather than a forced
 * singleton (like `RedisClient`); use `getIdApiClient` for a process-wide instance.
 *
 * Errors: non-2xx responses, network failures and timeouts reject with `IdApiError`. Methods
 * that historically never threw (`changePassword`, TOTP methods, `logoutOtherSessions`, etc.)
 * keep returning a failure result instead.
 */
export class IdApiClient {
  readonly config: IdApiConfig;
  readonly server: string;
  readonly port?: number | string;
  readonly routes: IdApiRoutes;
  readonly timeout: number;
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly canDeleteUser: boolean;
  readonly strictIds: boolean;

  private readonly basicAuthHeader?: string;

  /**
   * @param {IdApiConfig} [config] Id-api client config.
   */
  constructor(config: IdApiConfig = {}) {
    this.config = config;
    this.server = config.server || DEFAULT_SERVER;
    this.port = config.port || (config.server ? undefined : DEFAULT_PORT);
    this.routes = { ...ID_API_DEFAULT_ROUTES, ...config.routes };
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.canDeleteUser = config.canDeleteUser !== false;
    this.strictIds = config.strictIds === true;
    this.basicAuthHeader = this.buildBasicAuthHeader(config);
  }

  /**
   * Id-api base URL: server with the port when it is defined.
   * @returns {string}
   */
  get baseUrl(): string {
    return this.port ? `${this.server}:${this.port}` : this.server;
  }

  // ---------------------------------------------------------------------------
  // OAuth.
  // ---------------------------------------------------------------------------

  /**
   * Get tokens by the authorization code. `POST /oauth/token/` (form).
   * @param {string} code Auth code.
   * @returns {Promise<IdApiTokens>}
   */
  async getTokens(code: string): Promise<IdApiTokens> {
    const { body } = await this.request({
      method: 'POST',
      route: this.routes.getToken,
      form: { grant_type: 'authorization_code', code, client_id: this.clientId, client_secret: this.clientSecret },
    });

    if (!body?.access_token || !body?.refresh_token) {
      this.log('login-error-id-response-without-tokens', { hasAccessToken: !!body?.access_token, hasRefreshToken: !!body?.refresh_token }, 'error');
      throw new Error(IdApiErrorMessage.TokensNotResponsed);
    }

    return { accessToken: body.access_token, refreshToken: body.refresh_token };
  }

  /**
   * Renew tokens by the refresh token. `POST /oauth/token/` (form).
   * @param {string} refreshToken Refresh token.
   * @returns {Promise<IdApiTokens>}
   */
  async renewTokens(refreshToken: string): Promise<IdApiTokens> {
    const { body } = await this.request({
      method: 'POST',
      route: this.routes.getToken,
      form: { grant_type: 'refresh_token', refresh_token: refreshToken, client_id: this.clientId, client_secret: this.clientSecret },
    });

    if (!body?.access_token || !body?.refresh_token) {
      throw new Error(IdApiErrorMessage.TokensNotResponsed);
    }

    return { accessToken: body.access_token, refreshToken: body.refresh_token };
  }

  /**
   * Get the user by access token. `GET /user/info?access_token=` (no basic auth).
   * @param {string} accessToken Access token.
   * @returns {Promise<IdApiUser>} Raw user (with `services`).
   */
  async getUser(accessToken: string): Promise<IdApiUser> {
    const { body } = await this.request({ method: 'GET', route: this.routes.getUserInfo, query: { access_token: accessToken } });

    if (!body?.userId) {
      this.log('login-error-id-response-without-user-id', { response: body }, 'error');
      throw new Error(IdApiErrorMessage.UserIdNotResponsed);
    }
    if (!body.services) {
      this.log('login-error-id-response-without-user-eds-pem', { userId: body.userId });
    }

    return body;
  }

  // ---------------------------------------------------------------------------
  // Users: read.
  // ---------------------------------------------------------------------------

  /**
   * Get the users list. `GET /user` (basic auth).
   * @param {IdApiUsersQuery} [query] Query.
   * @returns {Promise<IdApiUser[]>}
   */
  async getUsers(query: IdApiUsersQuery = {}): Promise<IdApiUser[]> {
    const { body } = await this.getUsersPage(query);
    return body;
  }

  /**
   * Get the users list with the response status and headers. `GET /user` (basic auth).
   * @param {IdApiUsersQuery} [query] Query.
   * @returns {Promise<IdApiHttpResult<IdApiUser[]>>}
   */
  async getUsersPage(query: IdApiUsersQuery = {}): Promise<IdApiHttpResult<IdApiUser[]>> {
    return this.request({ method: 'GET', route: this.routes.getUsers, query: { ...query }, basicAuth: true });
  }

  /**
   * Find the user by ID. `GET /user/:id` (basic auth). Returns `undefined` on a non-string ID or any failure.
   * @param {string} id User ID.
   * @returns {Promise<IdApiUser | undefined>} User with `name` filled in.
   */
  async findUserById(id: string): Promise<(IdApiUser & { name: string }) | undefined> {
    if (typeof id !== 'string') {
      return undefined;
    }

    try {
      this.log('id-request-find-by-user-id', { id });
      const { body } = await this.request({ method: 'GET', route: `${this.routes.findUserById}/${encodeURIComponent(id)}`, basicAuth: true });
      return body ? { ...body, name: this.concatUserName(body) } : body;
    } catch (error: any) {
      this.log('id-request-find-by-user-id-error', { id, error: error.message }, 'error');
    }
  }

  /**
   * Find the user by ID using (and filling) a cache array.
   * @param {string} userId User ID.
   * @param {IdApiUser[]} [cachedUsers] Cached users.
   * @returns {Promise<IdApiUser | undefined>}
   */
  async findUserByIdWithCache(userId: string, cachedUsers: IdApiUser[] = []): Promise<IdApiUser | undefined> {
    const cached = cachedUsers.find((v) => v.userId === userId);
    if (cached) {
      return cached;
    }

    const user = await this.findUserById(userId);
    if (user) {
      cachedUsers.push(user);
      return user;
    }
  }

  /**
   * Get users by IDs using a cache array. Returns the cache plus the newly found users.
   * @param {string[]} userIds User IDs.
   * @param {IdApiUserInfo[]} [cachedUsers] Cached users.
   * @returns {Promise<IdApiUserInfo[]>}
   */
  async getUsersByIdsWithCache(userIds: string[], cachedUsers: IdApiUserInfo[] = []): Promise<IdApiUserInfo[]> {
    const notCachedIds = _.uniq(userIds).filter((userId) => !cachedUsers.some((v) => v.userId === userId));
    if (notCachedIds.length === 0) {
      return cachedUsers;
    }

    return cachedUsers.concat(await this.getUsersByIds(notCachedIds));
  }

  /**
   * Get users by IDs. `POST /user/info/id` (basic auth). Returns raw users.
   * @param {string | string[]} usersIds User ID or IDs.
   * @param {IdApiGetUsersByIdsOptions} [options] Options (`withPrivateProps` is ignored here).
   * @returns {Promise<IdApiUser[]>}
   */
  async getUsersByIdsRaw(usersIds: string | string[], options: IdApiGetUsersByIdsOptions = {}): Promise<IdApiUser[]> {
    const strictIds = options.strictIds ?? this.strictIds;
    const ids = (Array.isArray(usersIds) ? usersIds : [usersIds]).filter((v) => typeof v === 'string' && (!strictIds || v.length === USER_ID_LENGTH));
    if (ids.length === 0) {
      return [];
    }

    this.log('get-user-by-id-request', { id: ids });
    const { body } = await this.request({
      method: 'POST',
      route: this.routes.getUserInfoById,
      query: options.briefInfo === undefined ? undefined : { brief_info: options.briefInfo },
      json: { id: ids },
      basicAuth: true,
    });

    if (!Array.isArray(body)) {
      throw new Error(IdApiErrorMessage.UserNotResponsed);
    }

    return body;
  }

  /**
   * Get users by IDs. `POST /user/info/id` (basic auth). Returns normalized user info.
   * @param {string | string[]} usersIds User ID or IDs.
   * @param {IdApiGetUsersByIdsOptions} [options] Options.
   * @returns {Promise<IdApiUserInfo[]>}
   */
  async getUsersByIds(usersIds: string | string[], options: IdApiGetUsersByIdsOptions = {}): Promise<IdApiUserInfo[]> {
    const users = await this.getUsersByIdsRaw(usersIds, options);
    return users.map((user) => this.getMainUserInfo(user, options.withPrivateProps) as IdApiUserInfo);
  }

  /**
   * Get users by codes (IPNs). `POST /user/info/ipn` (basic auth). Returns raw users.
   * @param {string | number | Array<string | number>} codes Code or codes.
   * @returns {Promise<IdApiUser[]>}
   */
  async getUsersByCodesRaw(codes: string | number | Array<string | number>): Promise<IdApiUser[]> {
    this.log('user-find-by-code-request', { ipn: codes });
    const { body } = await this.request({ method: 'POST', route: this.routes.getUserByCode, json: { ipn: codes }, basicAuth: true });

    if (!Array.isArray(body)) {
      throw new Error(IdApiErrorMessage.UserNotResponsed);
    }

    return body;
  }

  /**
   * Get the user by code (IPN). `POST /user/info/ipn` (basic auth).
   * @param {string | number | Array<string | number>} code Code or codes.
   * @param {IdApiUserLookupOptions} [options] Options.
   * @returns {Promise<IdApiUserInfo | IdApiUserInfo[] | null>} The first user (or `null`) for a single code, the list for an array.
   */
  async getUserByCode(
    code: string | number | Array<string | number>,
    options: IdApiUserLookupOptions = {},
  ): Promise<IdApiUserInfo | IdApiUserInfo[] | null> {
    const users = (await this.getUsersByCodesRaw(code)).map((user) => this.getMainUserInfo(user, options.withPrivateProps) as IdApiUserInfo);
    return Array.isArray(code) ? users : (users[0] ?? null);
  }

  /**
   * Get users by EDRPOU codes. `POST /user/info/edrpou` (basic auth). Returns raw users.
   * @param {string | string[]} edrpou EDRPOU or list.
   * @returns {Promise<IdApiUser[]>}
   */
  async getUsersByEdrpouRaw(edrpou: string | string[]): Promise<IdApiUser[]> {
    const { body } = await this.request({
      method: 'POST',
      route: this.routes.getUserByEdrpou,
      json: { edrpou: Array.isArray(edrpou) ? edrpou : [edrpou] },
      basicAuth: true,
    });

    if (!Array.isArray(body)) {
      throw new Error(IdApiErrorMessage.UserNotResponsed);
    }

    return body;
  }

  /**
   * Get the user by email. `GET /user?email=` (basic auth).
   * @param {string | string[]} email Email (or a list, sent comma-joined).
   * @param {IdApiUserLookupOptions} [options] Options.
   * @returns {Promise<IdApiUserInfo | IdApiUserInfo[] | null>} The first user (or `null`) for a single email, the list for an array.
   */
  async getUserByEmail(email: string | string[], options: IdApiUserLookupOptions = {}): Promise<IdApiUserInfo | IdApiUserInfo[] | null> {
    this.log('user-find-by-email-request', { email });
    const { body } = await this.request({ method: 'GET', route: this.routes.getUsers, query: { email: String(email) }, basicAuth: true });

    if (!Array.isArray(body)) {
      throw new Error(IdApiErrorMessage.UserNotResponsed);
    }

    const users = body.map((user) => this.getMainUserInfo(user, options.withPrivateProps) as IdApiUserInfo);
    return Array.isArray(email) ? users : (users[0] ?? null);
  }

  /**
   * Get the user info by phone. `GET /user/info/phone?phone=` (basic auth).
   * @param {string} phone Phone.
   * @returns {Promise<IdApiUser>} Raw user.
   */
  async getUserInfoByPhone(phone: string): Promise<IdApiUser> {
    const { body } = await this.request({ method: 'GET', route: this.routes.getUserInfoByPhone, query: { phone }, basicAuth: true });
    return body;
  }

  /**
   * Search users. `POST /user/info/search` (basic auth). Returns raw users.
   * @param {string} searchString Search string.
   * @param {number} [limit] Limit. Default: 10.
   * @returns {Promise<IdApiUser[]>}
   */
  async searchUsersRaw(searchString: string, limit: number = DEFAULT_SEARCH_USERS_LIMIT): Promise<IdApiUser[]> {
    this.log('user-searching-request', { searchString, limit });
    const { body } = await this.request({ method: 'POST', route: this.routes.searchUsers, json: { searchString, limit }, basicAuth: true });

    if (!Array.isArray(body)) {
      throw new Error(IdApiErrorMessage.UsersListNotResponsed);
    }

    return body;
  }

  /**
   * Search users. `POST /user/info/search` (basic auth). Returns normalized user info.
   * @param {string} searchString Search string.
   * @param {number} [limit] Limit. Default: 10.
   * @returns {Promise<IdApiUserInfo[]>}
   */
  async searchUsers(searchString: string, limit: number = DEFAULT_SEARCH_USERS_LIMIT): Promise<IdApiUserInfo[]> {
    const users = await this.searchUsersRaw(searchString, limit);
    return users.map((user) => this.getMainUserInfo(user) as IdApiUserInfo);
  }

  /**
   * Check whether the email is registered. `GET /user/info/email/check?email=` (basic auth).
   * @param {string} email Email.
   * @returns {Promise<boolean>}
   */
  async checkEmail(email: string): Promise<boolean> {
    const { body } = await this.request({ method: 'GET', route: this.routes.checkEmail, query: { email }, basicAuth: true });

    if (typeof body !== 'object' || body === null) {
      throw new Error(IdApiErrorMessage.EmailExistenceNotResponsed);
    }

    return !!body.isExist;
  }

  // ---------------------------------------------------------------------------
  // Users: write.
  // ---------------------------------------------------------------------------

  /**
   * Update the user by access token. `POST /user/info` (form, access token in the body).
   * @param {string} userId User ID.
   * @param {string} accessToken Access token.
   * @param {IdApiUpdateUserOptions} [options] Fields to update.
   * @returns {Promise<boolean>} `true` when id-api answered `ok`.
   */
  async updateUser(userId: string, accessToken: string, options: IdApiUpdateUserOptions = {}): Promise<boolean> {
    const asBool = (value?: boolean): string | undefined => (value === true ? 'true' : value === false ? 'false' : undefined);
    const isTwoFactorAuthEnabled = options.useTwoFactorAuth === true || options.useTwoFactorAuth === 'true';
    const form: Record<string, string | undefined> = {
      'MIME Type': CONTENT_TYPE_FORM_URL_ENCODED,
      userId,
      access_token: accessToken,
      gender: options.gender,
      birthday: options.birthday,
      legalEntityDateRegistration: options.legalEntityDateRegistration,
      phone: options.phone,
      isValidPhone: options.isValidPhone ? 'true' : undefined,
      'valid[phone]': options.valid?.phone ? 'true' : undefined,
      email: options.email,
      isValidEmail: options.isValidEmail ? 'true' : undefined,
      'valid[email]': options.valid?.email ? 'true' : undefined,
      useTwoFactorAuth: asBool(typeof options.useTwoFactorAuth === 'string' ? options.useTwoFactorAuth === 'true' : options.useTwoFactorAuth),
      twoFactorType: options.twoFactorType || (isTwoFactorAuthEnabled ? 'phone' : undefined),
      isIndividualEntrepreneur: asBool(options.isIndividualEntrepreneur),
      address: options.address,
      addressStruct: options.addressStruct && JSON.stringify(options.addressStruct),
      passport_series: options.passportSeries,
      passport_number: options.passportNumber,
      passport_issue_date: options.passportIssueDate,
      passport_issued_by: options.passportIssuedBy,
      foreigners_document_series: options.foreignersDocumentSeries,
      foreigners_document_number: options.foreignersDocumentNumber,
      foreigners_document_issue_date: options.foreignersDocumentIssueDate,
      foreigners_document_expire_date: options.foreignersDocumentExpireDate,
      foreigners_document_issued_by: options.foreignersDocumentIssuedBy,
      foreigners_document_type: options.foreignersDocumentType ? JSON.stringify(options.foreignersDocumentType) : undefined,
      id_card_number: options.idCardNumber,
      id_card_issue_date: options.idCardIssueDate,
      id_card_issued_by: options.idCardIssuedBy,
      id_card_expiry_date: options.idCardExpiryDate,
      is_private_house: asBool(options.isPrivateHouse),
    };

    this.log('user-info-updating-request', { userId, fields: Object.keys(form).filter((key) => typeof form[key] === 'string') });
    const { body } = await this.request({ method: 'POST', route: this.routes.updateUserInfo, form });
    this.log('user-info-updating-response', { userId, response: body });

    return body === USER_INFO_UPDATED_RESPONSE;
  }

  /**
   * Update the user by ID. `PUT /user/info/:id` (basic auth).
   * @param {string} id User ID.
   * @param {Record<string, unknown>} data Fields to update.
   * @param {string} [initiator] Update initiator (sent as `updateInitiator` when defined).
   * @returns {Promise<string>} Id-api response (`ok`).
   * @throws {Error} When id-api answers anything but `ok`.
   */
  async updateUserById(id: string, data: Record<string, unknown>, initiator?: string): Promise<string> {
    const { body } = await this.request({
      method: 'PUT',
      route: `${this.routes.updateUserById}/${encodeURIComponent(id)}`,
      json: initiator === undefined ? data : { ...data, updateInitiator: initiator },
      basicAuth: true,
    });
    this.log('user-updated', { userId: id, response: body });

    if (body !== USER_INFO_UPDATED_RESPONSE) {
      throw new Error(IdApiErrorMessage.UpdateUserFailed);
    }

    return body;
  }

  /**
   * Update the user onboarding. `PUT /user/info/onboarding` (basic auth).
   * @param {string} userId User ID.
   * @param {{onboardingTaskId: string, needOnboarding: boolean}} params Params.
   * @returns {Promise<void>}
   */
  async updateUserOnboarding(userId: string, params: { onboardingTaskId: string; needOnboarding: boolean }): Promise<void> {
    const json = { userId, onboardingTaskId: params.onboardingTaskId, needOnboarding: params.needOnboarding };

    this.log('update-user-onboarding-request', json);
    const { body } = await this.request({ method: 'PUT', route: this.routes.updateUserOnboarding, json, basicAuth: true });
    this.log('update-user-onboarding-response', { response: body });
  }

  /**
   * Delete the user. `DELETE /user` (basic auth, JSON body). Skipped when `canDeleteUser` is `false`.
   * @param {string} userId User ID.
   * @returns {Promise<IdApiSuccessResult>}
   */
  async deleteUser(userId: string): Promise<IdApiSuccessResult> {
    if (!this.canDeleteUser) {
      return { success: false, message: 'Method is not allowed' };
    }

    try {
      this.log('delete-user-request', { userId });
      const { body } = await this.request({ method: 'DELETE', route: this.routes.deleteUser, json: { userId }, basicAuth: true });

      if (body?.error) {
        this.log('delete-user-error', { error: body.error }, 'error');
        return { success: false, error: body.error };
      }

      this.log('delete-user-response', { response: body });
      return { ...(typeof body === 'object' && body ? body : {}), success: body?.success !== false };
    } catch (error: any) {
      this.log('delete-user-error', { error: error.message }, 'error');
      return { success: false };
    }
  }

  /**
   * Logout the user from every session. `POST /user/:id/logout` (basic auth).
   * @param {string} id User ID.
   * @returns {Promise<any>} Id-api response.
   */
  async logoutByUserId(id: string): Promise<any> {
    const { body } = await this.request({
      method: 'POST',
      route: this.routes.logoutByUserId.replace(':id', encodeURIComponent(id)),
      basicAuth: true,
    });
    return body;
  }

  /**
   * Logout other sessions. `POST /user/logout_other_sessions` (form, access token in the body). Never throws.
   * @param {string} userId User ID.
   * @param {string} accessToken Access token.
   * @param {string} refreshToken Refresh token.
   * @returns {Promise<boolean>} Is accepted indicator.
   */
  async logoutOtherSessions(userId: string, accessToken: string, refreshToken: string): Promise<boolean> {
    let response: any;
    try {
      ({ body: response } = await this.request({
        method: 'POST',
        route: this.routes.logoutOtherSessions,
        form: { 'MIME Type': CONTENT_TYPE_FORM_URL_ENCODED, userId, access_token: accessToken, refresh_token: refreshToken },
      }));
    } catch (error: any) {
      this.log('logout-other-sessions-request-error', { error: error && error.message, userId }, 'error');
    }
    this.log('logout-other-sessions-response', { response, userId });

    return !!response?.data?.accepted;
  }

  /**
   * Prepare the user. `POST /user/prepare` (basic auth, form). Never throws.
   * The IPN is transliterated when `ipnTransliterator` is configured.
   * @param {IdApiPrepareUserParams} params Params.
   * @returns {Promise<IdApiUser | undefined>} Prepared user or `undefined` when id-api did not return a user ID.
   */
  async prepareUser(params: IdApiPrepareUserParams): Promise<IdApiUser | undefined> {
    const { name, surname, middleName, ipn, email } = params;
    const form = {
      'MIME Type': CONTENT_TYPE_FORM_URL_ENCODED,
      name,
      surname,
      middlename: middleName,
      ipn: this.config.ipnTransliterator ? this.config.ipnTransliterator.transform(ipn) : ipn,
      email,
    };

    let response: any;
    try {
      this.log('prepare-user-request', { name, surname, middleName, email }, 'info');
      ({ body: response } = await this.request({ method: 'POST', route: this.routes.prepareUser, form, basicAuth: true }));
    } catch (error: any) {
      this.log('prepare-user-error', { error: error && error.message }, 'error');
    }

    if (!response?.userId) {
      this.log('prepare-user-response-error', { response }, 'error');
      return undefined;
    }
    this.log('prepare-user-response', { response }, 'info');

    return response;
  }

  /**
   * Create a user with the local authorization type. `POST /user/create_local` (basic auth).
   * @param {IdApiCreateLocalUserOptions} options User options.
   * @returns {Promise<any>} Id-api response.
   */
  async createLocalUser(options: IdApiCreateLocalUserOptions): Promise<any> {
    try {
      this.log('create-local-user-options', { ...options, password: '***' });
      const { body } = await this.request({ method: 'POST', route: this.routes.createLocalUser, json: options, basicAuth: true });
      return body;
    } catch (error: any) {
      this.log('create-local-user-error', { error: error.message }, 'error');
      throw error;
    }
  }

  /**
   * Set the user password. `POST /user/password/set` (basic auth).
   * @param {{id: string, password: string}} params Params.
   * @returns {Promise<any>} Id-api response.
   */
  async setUserPassword({ id, password }: { id: string; password: string }): Promise<any> {
    this.log('set-user-password', { id, password: '***' });
    const { body } = await this.request({ method: 'POST', route: this.routes.setPassword, json: { userId: id, password }, basicAuth: true });
    this.log('set-user-password', { response: body });
    return body;
  }

  /**
   * Change the local user password. `POST /authorise/local/change_password` (basic auth). Never throws.
   * @param {string} email User email.
   * @param {string} oldPassword Old password.
   * @param {string} newPassword New password.
   * @returns {Promise<IdApiSuccessResult>}
   */
  async changePassword(email: string, oldPassword: string, newPassword: string): Promise<IdApiSuccessResult> {
    try {
      this.log('change-user-password-request', { email });
      const { body } = await this.request({
        method: 'POST',
        route: this.routes.changePassword,
        json: { email, oldPassword, newPassword },
        basicAuth: true,
      });
      const { success, error, message } = body || {};

      if (error || success === false) {
        this.log('change-user-password-error', { error: error || message || 'Unknown error' }, 'error');
        return { success: false, error: error || message };
      }

      this.log('change-user-password-response', { success, message });
      return { success: success !== false, message };
    } catch (error: any) {
      this.log('change-user-password-error', { error: error.message }, 'error');
      return { success: false, error: error?.body?.error };
    }
  }

  // ---------------------------------------------------------------------------
  // Phone and email confirmation.
  // ---------------------------------------------------------------------------

  /**
   * Send an SMS for the phone verification. `GET /sign_up/confirmation/phone/send?phone=` (no basic auth).
   * @param {string | number} phone Phone.
   * @returns {Promise<string>} `sendBySms` value.
   */
  async sendSms(phone: string | number): Promise<string> {
    const { body } = await this.request({ method: 'GET', route: this.routes.sendSms, query: { phone } });

    if (!body?.sendBySms) {
      throw new Error(IdApiErrorMessage.UserSmsNotResponsed);
    }

    return body.sendBySms;
  }

  /**
   * Verify the phone. `GET /sign_up/confirmation/phone/verify?phone=&code=` (no basic auth).
   * @param {string | number} phone Phone.
   * @param {string | number} code SMS code.
   * @returns {Promise<boolean>} Is verified indicator.
   */
  async verifyPhone(phone: string | number, code: string | number): Promise<boolean> {
    const { body } = await this.request({ method: 'GET', route: this.routes.verifyPhone, query: { phone, code } });
    return body === SUCCESSFUL_SENT_SMS;
  }

  /**
   * Verify the phone and set it as confirmed. `POST /sign_up/confirmation/phone/verify?phone=&code=&access_token=` (no basic auth).
   * @param {string | number} phone Phone.
   * @param {string | number} code SMS code.
   * @param {string} accessToken Access token.
   * @returns {Promise<any>} Id-api response.
   */
  async verifyPhoneAndSet(phone: string | number, code: string | number, accessToken: string): Promise<any> {
    const { body } = await this.request({
      method: 'POST',
      route: this.routes.verifyPhoneAndSet,
      query: { phone, code, access_token: accessToken },
    });
    this.log('user-phone-verification-response', { phone, response: body });
    return body;
  }

  /**
   * Check whether the phone exists and is confirmed. `GET /sign_up/confirmation/phone/exist?phone=` (no basic auth).
   * @param {string | number} phone Phone.
   * @returns {Promise<IdApiPhoneExistence>}
   */
  async checkPhoneExist(phone: string | number): Promise<IdApiPhoneExistence> {
    const { body } = await this.request({ method: 'GET', route: this.routes.phoneExist, query: { phone } });

    return {
      isExist: !!(body && body.text && body.text !== 'null'),
      isConfirmed: !!(body && body.valid && body.valid.phone),
    };
  }

  /**
   * Send the change email code. `GET /user/info/email/send?email=` (no basic auth).
   * @param {string} email New email.
   * @returns {Promise<any>} Id-api response.
   */
  async changeEmail(email: string): Promise<any> {
    const { body } = await this.request({ method: 'GET', route: this.routes.changeEmail, query: { email } });

    if (typeof body === 'undefined') {
      throw new Error(IdApiErrorMessage.UserChangeEmailNotResponsed);
    }

    return body;
  }

  /**
   * Confirm the email change. `GET /user/info/email/set?email=&code_email=&access_token=` (no basic auth).
   * @param {string} email New email.
   * @param {string | number} code Email code.
   * @param {string} accessToken Access token.
   * @returns {Promise<IdApiUser>} Id-api response (user).
   */
  async confirmChangeEmail(email: string, code: string | number, accessToken: string): Promise<IdApiUser> {
    const { body } = await this.request({
      method: 'GET',
      route: this.routes.confirmChangeEmail,
      query: { email, code_email: code, access_token: accessToken },
    });

    if (!body || !body.userId) {
      throw new Error(IdApiErrorMessage.UserConfirmationChangeEmailNotResponsed);
    }

    return body;
  }

  /**
   * Check the email confirmation code. `GET /user/info/email/check_email_confirmation_code?email=&code_email=&access_token=` (no basic auth).
   * @param {string} email Email.
   * @param {string | number} code Email code.
   * @param {string} accessToken Access token.
   * @returns {Promise<{isCodeConfirmed: boolean}>}
   */
  async checkEmailConfirmationCode(email: string, code: string | number, accessToken: string): Promise<{ isCodeConfirmed: boolean }> {
    const { body } = await this.request({
      method: 'GET',
      route: this.routes.checkEmailConfirmationCode,
      query: { email, code_email: code, access_token: accessToken },
    });

    if (!body || !body.isCodeConfirmed) {
      throw new Error(IdApiErrorMessage.EmailCodeNotConfirmed);
    }

    return body;
  }

  // ---------------------------------------------------------------------------
  // TOTP.
  // ---------------------------------------------------------------------------

  /**
   * Generate a user TOTP secret. `GET /totp/generate?userId=` (basic auth). Never throws.
   * @param {string} userId User ID.
   * @returns {Promise<{success: boolean, secret?: string, uri?: string}>}
   */
  async generateUserTotp(userId: string): Promise<{ success: boolean; secret?: string; uri?: string }> {
    try {
      const { body } = await this.request({ method: 'GET', route: this.routes.generateUserTotp, query: { userId }, basicAuth: true });
      const { secret, uri, error } = body || {};

      if (error) {
        this.log('generate-user-totp-error', { error: error.message || error }, 'error');
        return { success: false };
      }

      return { success: true, secret, uri };
    } catch (error: any) {
      this.log('generate-user-totp-error', { error: error.message }, 'error');
      return { success: false };
    }
  }

  /**
   * Enable the user TOTP secret. `POST /totp/enable` (basic auth). Never throws.
   * @param {string} userId User ID.
   * @param {string} secret TOTP secret.
   * @param {string} code TOTP code.
   * @returns {Promise<{success: boolean}>}
   */
  async enableUserTotpSecret(userId: string, secret: string, code: string): Promise<{ success: boolean }> {
    return this.postTotp('enable-user-totp', this.routes.enableUserTotpSecret, { userId, secret, code });
  }

  /**
   * Disable the user TOTP secret. `POST /totp/disable` (basic auth). Never throws.
   * @param {string} userId User ID.
   * @param {string} code TOTP code.
   * @returns {Promise<{success: boolean}>}
   */
  async disableUserTotpSecret(userId: string, code: string): Promise<{ success: boolean }> {
    return this.postTotp('disable-user-totp', this.routes.disableUserTotpSecret, { userId, code });
  }

  // ---------------------------------------------------------------------------
  // Admin, history and statistics.
  // ---------------------------------------------------------------------------

  /**
   * Get the login history. `GET /login_history?offset=&limit=&filter=` (basic auth, filter sent as a JSON string).
   * @param {IdApiPaging} [paging] Paging.
   * @returns {Promise<IdApiPagedResult<IdApiLoginHistoryEntry>>}
   */
  async getLoginHistory({ offset = 0, limit = 10, filter = {} }: IdApiPaging = {}): Promise<IdApiPagedResult<IdApiLoginHistoryEntry>> {
    const filterString = typeof filter === 'string' ? filter : JSON.stringify(filter);

    const { body } = await this.request({
      method: 'GET',
      route: this.routes.getLoginHistory,
      query: { offset, limit, filter: filterString },
      basicAuth: true,
    });

    if (!Array.isArray(body?.data)) {
      throw new Error(IdApiErrorMessage.LoginHistoryNotResponsed);
    }

    const data = body.data.map((v: any): IdApiLoginHistoryEntry => ({
      id: v.id,
      createdAt: v.created_at,
      userId: v.user_id,
      userName: v.user_name,
      ip: v.ip,
      userAgent: v.user_agent,
      clientId: v.client_id,
      clientName: v.client_name,
      isBlocked: v.is_blocked,
      actionType: v.action_type,
      expiresAt: v.expires_at,
    }));

    return { data, meta: body.meta };
  }

  /**
   * Get the user admin actions. `GET /user_admin_actions?offset=&limit=&filter[...]=` (basic auth, filter sent as a nested query object).
   * @param {IdApiPaging} [paging] Paging.
   * @returns {Promise<IdApiPagedResult<IdApiUserAdminAction>>}
   */
  async getUserAdminActions({ offset = 0, limit = 10, filter = {} }: IdApiPaging = {}): Promise<IdApiPagedResult<IdApiUserAdminAction>> {
    const { body } = await this.request({
      method: 'GET',
      route: this.routes.getUserAdminActions,
      query: { offset, limit, filter },
      basicAuth: true,
    });

    if (!Array.isArray(body?.data)) {
      throw new Error(IdApiErrorMessage.UserAdminActionsNotResponsed);
    }

    const data = body.data.map((v: any): IdApiUserAdminAction => ({
      id: v.id,
      user: {
        id: v.data?.userId,
        lastName: v.data?.last_name,
        firstName: v.data?.first_name,
        middleName: v.data?.middle_name,
        ipn: v.data?.ipn,
        email: v.data?.email,
      },
      createdBy: v.created_by,
      createdAt: v.created_at,
      actionType: v.action_type,
    }));

    return { data, meta: body.meta };
  }

  /**
   * Get the users statistics for a day. `GET /stat/:date` (basic auth).
   * @param {{date: string}} params Date in `YYYY-MM-DD` format.
   * @returns {Promise<IdApiUserStat>}
   */
  async getUserStatByDate({ date }: { date: string }): Promise<IdApiUserStat> {
    const { body } = await this.request({ method: 'GET', route: `${this.routes.getUserStat}/${encodeURIComponent(date)}`, basicAuth: true });

    if (typeof body?.new_users === 'undefined') {
      throw new Error(IdApiErrorMessage.UserStatNotResponsed);
    }

    return body;
  }

  /**
   * Get the users statistics summed over a period (one `GET /stat/:date` request per day).
   * @param {{from: string, to: string}} params Dates in `YYYY-MM-DD` format.
   * @returns {Promise<IdApiUserStat>}
   */
  async getUserStatByPeriod({ from, to }: { from: string; to: string }): Promise<IdApiUserStat> {
    if (new Date(from) > new Date(to)) {
      throw new Error(IdApiErrorMessage.StatPeriod);
    }

    const stats = await Promise.all(this.getDatesBetweenTwoDates(from, to).map((date) => this.getUserStatByDate({ date })));

    return stats.reduce(
      (total, el) => ({
        new_users: total.new_users + Number(el.new_users || 0),
        on_board_users: total.on_board_users + Number(el.on_board_users || 0),
        login_count: total.login_count + Number(el.login_count || 0),
      }),
      { new_users: 0, on_board_users: 0, login_count: 0 },
    );
  }

  /**
   * Which of the LDAP groups exist in the directory. `POST /ldap/groups/exists` (basic auth).
   * @param {string[]} dns Group DNs.
   * @returns {Promise<string[]>} Existing group DNs.
   */
  async ldapGroupsExist(dns: string[]): Promise<string[]> {
    const { body } = await this.request({ method: 'POST', route: this.routes.ldapGroupsExist, json: { dns }, basicAuth: true });

    if (!Array.isArray(body?.existing)) {
      throw new Error(IdApiErrorMessage.WrongResponseFormat);
    }

    return body.existing;
  }

  // ---------------------------------------------------------------------------
  // Test and diagnostics.
  // ---------------------------------------------------------------------------

  /**
   * Add a test code to log in with. `POST /oauth/token/test_code` (basic auth).
   * @param {string} code Code to initialize.
   * @param {string} userId User ID to log in with the code.
   * @returns {Promise<boolean>} Is initialized indicator.
   */
  async addTestCode(code: string, userId: string): Promise<boolean> {
    this.log('add-test-code-request', { userId });
    const { body } = await this.request({ method: 'POST', route: this.routes.addTestCode, json: { code, userId }, basicAuth: true });

    if (typeof body !== 'object' || body === null) {
      throw new Error(IdApiErrorMessage.WrongResponseFormat);
    }
    if (body.error) {
      throw new Error(body.error.message);
    }
    if (typeof body.data !== 'object' || body.data === null) {
      throw new Error(IdApiErrorMessage.WrongResponseDataFormat);
    }

    return body.data.code === code;
  }

  /**
   * Send the ping request with auth. `GET /test/ping_with_auth` (basic auth). Never throws.
   * @returns {Promise<IdApiPingResult | undefined>} Version, customer and environment headers plus the body; `undefined` on failure.
   */
  async sendPingRequest(): Promise<IdApiPingResult | undefined> {
    try {
      const { headers, body } = await this.request({ method: 'GET', route: this.routes.pingWithAuth, basicAuth: true });
      this.log('send-ping-request-to-liquio-id', { headers, body });

      return { version: headers.version, customer: headers.customer, environment: headers.environment, body };
    } catch (error: any) {
      this.log('send-ping-request-to-liquio-id-error', { error: error.message }, 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers.
  // ---------------------------------------------------------------------------

  /**
   * Build the full avatar URL. An absolute URL (already built) is returned as is.
   * @param {string} [avaUrl] Avatar path returned by id-api, or an already built URL.
   * @returns {string} Full URL or an empty string.
   */
  buildAvatarUrl(avaUrl?: string): string {
    if (!avaUrl) {
      return '';
    }

    return ABSOLUTE_URL_REGEXP.test(avaUrl) ? avaUrl : `${this.baseUrl}${avaUrl}`;
  }

  /**
   * Concat the user name: last, first and middle name.
   * @param {object} user User.
   * @returns {string}
   */
  concatUserName(user: Pick<IdApiUser, 'last_name' | 'first_name' | 'middle_name'>): string {
    return `${user.last_name || ''} ${user.first_name || ''} ${user.middle_name || ''}`.trim();
  }

  /**
   * Get the main user info (normalized user).
   * @param {IdApiUser} user Raw user.
   * @param {boolean} [withPrivateProps] Keep every id-api property on the result.
   * @param {boolean} [myInfo] Take the position from `services.eds` of the "my info" response.
   * @returns {IdApiUserInfo | undefined}
   */
  getMainUserInfo(user: IdApiUser | undefined | null, withPrivateProps = false, myInfo = false): IdApiUserInfo | undefined {
    if (!user) {
      return undefined;
    }

    const trim = (value: any): any => (typeof value === 'string' ? value.trim() : value);
    const fullName = this.concatUserName({ last_name: trim(user.last_name), first_name: trim(user.first_name), middle_name: trim(user.middle_name) });
    const service = user.user_services?.[0];
    const serviceData = service?.data;
    const transliterator = this.config.ipnTransliterator;

    return {
      ...(withPrivateProps ? user : {}),
      userId: user.userId,
      address: user.address,
      addressStruct: user.addressStruct,
      name: this.config.legalEntityNameSource === 'company' && user.isLegal ? (user.companyName as string) : fullName,
      ceoName: user.isLegal ? fullName : undefined,
      isLegal: user.isLegal,
      isIndividualEntrepreneur: user.isIndividualEntrepreneur,
      companyName: user.companyName,
      companyUnit: user.companyUnit,
      first_name: trim(user.first_name),
      firstName: trim(user.first_name),
      last_name: trim(user.last_name),
      lastName: trim(user.last_name),
      middle_name: trim(user.middle_name),
      middleName: trim(user.middle_name),
      email: user.email,
      phone: user.phone,
      ipn: user.ipn,
      edrpou: user.edrpou,
      gender: user.gender,
      birthday: user.birthday,
      avaUrl: this.buildAvatarUrl(user.avaUrl),
      status: user.status,
      valid: user.valid,
      position: myInfo ? _.get(user, 'services.eds.data.title') : serviceData?.title || undefined,
      pem: serviceData?.pem,
      encodeCertSerial: serviceData?.encodeCertSerial,
      encodeCert: serviceData?.encodeCert,
      services: withPrivateProps
        ? user.services || {
            ldap: service?.provider === 'ldap' ? service : undefined,
            eds: service?.provider === 'eds' ? service : undefined,
            govid: service?.provider === 'govid' ? service : undefined,
          }
        : undefined,
      ...(transliterator && typeof user.ipn === 'string' ? { cyrillicIpnPassport: transliterator.reverse(user.ipn) } : {}),
    };
  }

  /**
   * Get the brief user info (userId, name, contacts, avatar URL) from a raw user.
   * @param {IdApiUser} user Raw user.
   * @returns {IdApiUserBrief}
   */
  getBriefUserInfo(user: IdApiUser): IdApiUserBrief {
    return {
      userId: user.userId,
      name: this.concatUserName(user),
      companyName: user.companyName,
      isLegal: user.isLegal,
      isIndividualEntrepreneur: user.isIndividualEntrepreneur,
      email: user.email,
      phone: user.phone,
      ipn: user.ipn,
      edrpou: user.edrpou,
      avaUrl: this.buildAvatarUrl(user.avaUrl),
    };
  }

  /**
   * Get dates between two dates, inclusive.
   * @param {string} from Date from, `YYYY-MM-DD`.
   * @param {string} to Date to, `YYYY-MM-DD`.
   * @returns {string[]} For example `['2023-09-01', '2023-09-02']`.
   */
  getDatesBetweenTwoDates(from: string, to: string): string[] {
    const dates: string[] = [];
    const current = new Date(from);
    const end = new Date(to);
    current.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
  }

  // ---------------------------------------------------------------------------
  // Internals.
  // ---------------------------------------------------------------------------

  private async postTotp(logPrefix: string, route: string, json: Record<string, unknown>): Promise<{ success: boolean }> {
    try {
      this.log(`${logPrefix}-request`, { userId: json.userId });
      const { body } = await this.request({ method: 'POST', route, json, basicAuth: true });

      if (body?.error) {
        this.log(`${logPrefix}-error`, { error: body.error }, 'error');
        return { success: false };
      }

      this.log(`${logPrefix}-response`, { success: body?.success });
      return { success: body?.success };
    } catch (error: any) {
      this.log(`${logPrefix}-error`, { error: error.message }, 'error');
      return { success: false };
    }
  }

  private buildBasicAuthHeader(config: IdApiConfig): string | undefined {
    const token =
      config.basicAuthToken ||
      (config.basicAuthUser ? Buffer.from(`${config.basicAuthUser}:${config.basicAuthPassword ?? ''}`).toString('base64') : undefined);
    if (!token) {
      return undefined;
    }

    return token.startsWith('Basic ') ? token : `Basic ${token}`;
  }

  private getLog(): IdApiLog | undefined {
    if (this.config.getLog) {
      return this.config.getLog();
    }

    const globalLog = (global as any).log;
    return globalLog && typeof globalLog.save === 'function' ? globalLog : undefined;
  }

  private log(event: string, data?: any, level?: 'info' | 'warn' | 'error'): void {
    try {
      this.getLog()?.save(event, data, level);
    } catch {
      // Logging must never break a request.
    }
  }

  /**
   * Do an HTTP request to id-api.
   * @throws {IdApiError} On a non-2xx status, a network failure or a timeout.
   */
  private async request(options: RequestOptions): Promise<IdApiHttpResult> {
    const headers: Record<string, string> = {};
    const traceId = getTraceId();
    if (traceId) {
      headers['x-trace-id'] = traceId;
    }
    if (options.basicAuth) {
      if (!this.basicAuthHeader) {
        throw new IdApiError(IdApiErrorMessage.BasicAuthNotConfigured, { code: 'BASIC_AUTH_NOT_CONFIGURED' });
      }
      headers.Authorization = this.basicAuthHeader;
    }

    let body: string | undefined;
    if (options.json !== undefined) {
      headers['Content-Type'] = CONTENT_TYPE_JSON;
      body = JSON.stringify(options.json);
    } else if (options.form) {
      headers['Content-Type'] = CONTENT_TYPE_FORM_URL_ENCODED;
      body = this.buildQuery(options.form);
    }

    const query = options.query ? this.buildQuery(options.query) : '';
    const url = `${this.baseUrl}${options.route}${query ? `?${query}` : ''}`;

    let response: Response;
    try {
      response = await fetch(url, { method: options.method, headers, body, signal: AbortSignal.timeout(this.timeout) });
    } catch (error: any) {
      const isTimeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      throw new IdApiError(isTimeout ? `Id-api request timed out after ${this.timeout}ms.` : error?.message || 'Network error', {
        code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
        cause: error,
      });
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    const parsedBody = this.parseBody(await response.text());

    if (!response.ok) {
      const message =
        typeof parsedBody === 'string' && parsedBody
          ? parsedBody
          : parsedBody
            ? JSON.stringify(parsedBody)
            : `Id-api responded with status ${response.status}.`;
      throw new IdApiError(message, { status: response.status, body: parsedBody, code: 'HTTP_ERROR' });
    }

    return { status: response.status, headers: responseHeaders, body: parsedBody };
  }

  private parseBody(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  /**
   * Build a query or form string. Undefined and null values are skipped; objects use the bracket notation (`filter[key]=value`).
   */
  private buildQuery(params: Record<string, unknown>): string {
    const search = new URLSearchParams();
    const append = (key: string, value: unknown): void => {
      if (value === undefined || value === null) {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, index) => append(`${key}[${index}]`, item));
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([childKey, childValue]) => append(`${key}[${childKey}]`, childValue));
      } else {
        search.append(key, String(value));
      }
    };

    Object.entries(params).forEach(([key, value]) => append(key, value));

    return search.toString();
  }
}
