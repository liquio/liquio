/**
 * Minimal structural shape for the log object each component exposes on `global.log`.
 */
export interface IdApiLog {
  save(event: string, data?: any, level?: 'info' | 'warn' | 'warning' | 'error'): void;
}

/**
 * Optional transliterator for IPN values written with cyrillic letters (passport-style IPNs).
 * Shaped after the `cyrillic-to-translit-js` instance API, so one can be passed as is.
 */
export interface IdApiIpnTransliterator {
  /** Cyrillic to latin. */
  transform(value: string): string;
  /** Latin to cyrillic. */
  reverse(value: string): string;
}

/**
 * Route paths of id-api used by the client. Every route can be overridden through `IdApiConfig.routes`.
 */
export interface IdApiRoutes {
  getToken: string;
  getUsers: string;
  findUserById: string;
  getUserInfo: string;
  getUserInfoById: string;
  getUserInfoByPhone: string;
  searchUsers: string;
  getUserByCode: string;
  getUserByEdrpou: string;
  updateUserInfo: string;
  updateUserById: string;
  updateUserOnboarding: string;
  deleteUser: string;
  logoutByUserId: string;
  logoutOtherSessions: string;
  prepareUser: string;
  createLocalUser: string;
  setPassword: string;
  changePassword: string;
  sendSms: string;
  verifyPhone: string;
  verifyPhoneAndSet: string;
  phoneExist: string;
  changeEmail: string;
  confirmChangeEmail: string;
  checkEmailConfirmationCode: string;
  checkEmail: string;
  addTestCode: string;
  pingWithAuth: string;
  generateUserTotp: string;
  enableUserTotpSecret: string;
  disableUserTotpSecret: string;
  ldapGroupsExist: string;
  getLoginHistory: string;
  getUserAdminActions: string;
  getUserStat: string;
}

/**
 * Id-api client config.
 */
export interface IdApiConfig {
  /** Id-api server, with protocol. Default: `http://id-api`. May already contain the port. */
  server?: string;
  /** Id-api port. Default: `8100` when `server` is not set, otherwise not appended. */
  port?: number | string;
  /** Route overrides. */
  routes?: Partial<IdApiRoutes>;
  /** Request timeout in ms. Default: `30000`. */
  timeout?: number;
  /** OAuth client ID. */
  clientId?: string;
  /** OAuth client secret. */
  clientSecret?: string;
  /** Base64 `user:password` token (a `Basic ` prefix is accepted). */
  basicAuthToken?: string;
  /** Basic auth user, used with `basicAuthPassword` when `basicAuthToken` is not set. */
  basicAuthUser?: string;
  /** Basic auth password, used with `basicAuthUser` when `basicAuthToken` is not set. */
  basicAuthPassword?: string;
  /** Keep only 24-character IDs in `getUsersByIds*` unless a call sets `strictIds` itself. Default: `false`. */
  strictIds?: boolean;
  /** Whether `deleteUser` is allowed. Default: `true`. */
  canDeleteUser?: boolean;
  /** Which value `name` takes for legal entities in the normalized user info. Default: `person`. */
  legalEntityNameSource?: 'person' | 'company';
  /** Transliterator for IPN values. When not set, transliteration is skipped. */
  ipnTransliterator?: IdApiIpnTransliterator;
  /** Returns the logger. Default: `global.log` when present, otherwise logging is skipped. */
  getLog?: () => IdApiLog | undefined;
}

/** Raw user as returned by id-api. */
export interface IdApiUser {
  userId: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  email?: string;
  phone?: string;
  ipn?: string;
  edrpou?: string;
  isLegal?: boolean;
  isIndividualEntrepreneur?: boolean;
  companyName?: string;
  companyUnit?: string;
  address?: string;
  addressStruct?: Record<string, unknown>;
  gender?: string;
  birthday?: string;
  avaUrl?: string;
  status?: string;
  valid?: Record<string, unknown>;
  role?: string;
  services?: any;
  user_services?: Array<{ provider?: string; data?: Record<string, any>; [key: string]: any }>;
  [key: string]: any;
}

/** Normalized user info. */
export interface IdApiUserInfo {
  userId: string;
  address?: string;
  addressStruct?: Record<string, unknown>;
  name: string;
  ceoName?: string;
  isLegal?: boolean;
  isIndividualEntrepreneur?: boolean;
  companyName?: string;
  companyUnit?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  middle_name?: string;
  middleName?: string;
  email?: string;
  phone?: string;
  ipn?: string;
  edrpou?: string;
  gender?: string;
  birthday?: string;
  avaUrl: string;
  status?: string;
  valid?: Record<string, unknown>;
  position?: string;
  pem?: string;
  encodeCertSerial?: string;
  encodeCert?: string;
  services?: any;
  cyrillicIpnPassport?: string;
  [key: string]: any;
}

/** Short user info (event component shape). */
export interface IdApiUserBrief {
  userId: string;
  name: string;
  companyName?: string;
  isLegal?: boolean;
  isIndividualEntrepreneur?: boolean;
  email?: string;
  phone?: string;
  ipn?: string;
  edrpou?: string;
  avaUrl: string;
}

export interface IdApiTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IdApiUsersQuery {
  id?: string;
  email?: string;
  phone?: string;
  search?: string;
  ipn?: string;
  role?: string;
  offset?: number;
  limit?: number;
}

export interface IdApiHttpResult<T = any> {
  status: number;
  headers: Record<string, string>;
  body: T;
}

/** Options of `updateUser` (self update by access token). */
export interface IdApiUpdateUserOptions {
  gender?: string;
  birthday?: string;
  legalEntityDateRegistration?: string;
  phone?: string;
  isValidPhone?: boolean;
  valid?: { phone?: boolean; email?: boolean };
  email?: string;
  isValidEmail?: boolean;
  /** `true`/`'true'` enables two factor auth (`twoFactorType` then defaults to `phone`), `false`/`'false'` disables it. */
  useTwoFactorAuth?: boolean | 'true' | 'false';
  twoFactorType?: string;
  isIndividualEntrepreneur?: boolean;
  address?: string;
  addressStruct?: Record<string, unknown>;
  passportSeries?: string;
  passportNumber?: string;
  passportIssueDate?: string;
  passportIssuedBy?: string;
  foreignersDocumentSeries?: string;
  foreignersDocumentNumber?: string;
  foreignersDocumentIssueDate?: string;
  foreignersDocumentExpireDate?: string;
  foreignersDocumentIssuedBy?: string;
  foreignersDocumentType?: unknown;
  idCardNumber?: string;
  idCardIssueDate?: string;
  idCardIssuedBy?: string;
  idCardExpiryDate?: string;
  isPrivateHouse?: boolean;
}

export interface IdApiUserLookupOptions {
  /** Keep every id-api property on the result. */
  withPrivateProps?: boolean;
}

export interface IdApiGetUsersByIdsOptions extends IdApiUserLookupOptions {
  /** Ask id-api for the brief user info. */
  briefInfo?: boolean;
  /** Keep only 24-character IDs. Default: the client `strictIds` config. */
  strictIds?: boolean;
}

export interface IdApiPaging {
  offset?: number;
  limit?: number;
  filter?: Record<string, unknown> | string;
}

export interface IdApiPagedResult<T> {
  data: T[];
  meta: { count: number; offset: number; limit: number };
}

export interface IdApiLoginHistoryEntry {
  id: string;
  createdAt: string;
  userId: string;
  userName: string;
  ip: string;
  userAgent: string;
  clientId: string;
  clientName: string;
  isBlocked: boolean;
  actionType: string;
  expiresAt: string;
}

export interface IdApiUserAdminAction {
  id: string;
  user: { id: string; lastName: string; firstName: string; middleName: string; ipn: string; email: string };
  createdBy: string;
  createdAt: string;
  actionType: string;
}

export interface IdApiUserStat {
  new_users: number;
  on_board_users: number;
  login_count: number;
}

export interface IdApiCreateLocalUserOptions {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  needOnboarding?: boolean;
  onboardingTaskId?: string;
  isChangeRequired?: boolean;
}

export interface IdApiPrepareUserParams {
  name: string;
  surname: string;
  middleName: string;
  ipn: string;
  email: string;
}

export interface IdApiPingResult {
  version?: string;
  customer?: string;
  environment?: string;
  body: any;
}

export interface IdApiSuccessResult {
  success: boolean;
  message?: string;
  error?: any;
}

export interface IdApiPhoneExistence {
  isExist: boolean;
  isConfirmed: boolean;
}
