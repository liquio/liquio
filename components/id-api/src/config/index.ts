import { Config as ConfigLoader } from '@liquio/back-core';
import { StrategyOptions } from 'passport-oauth2';
import { Dialect } from 'sequelize';

import { buildIdApiConfigSchema } from './schema';

export const DEFAULT_COOKIE_DOMAIN = '.liquio';
export const DEFAULT_CODE_RETRIES = 5;
export const DEFAULT_CODE_LENGTH = 6;

export interface AuthProviderDisplay {
  title?: string;
  icon?: string;
  description?: string;
}

export interface LdapProviderConfig {
  isEnabled?: boolean;
  display?: AuthProviderDisplay;
  connection?: {
    url?: string;
    startTLS?: boolean;
    tlsOptions?: {
      // PEM string or path to a PEM file.
      ca?: string;
      rejectUnauthorized?: boolean;
    };
    bindDN?: string;
    bindPassword?: string;
    timeout?: number;
    connectTimeout?: number;
  };
  baseDN?: string;
  // Defaults to baseDN.
  userSearchBase?: string;
  // Filter template, `{{username}}` is replaced with the escaped login.
  userFilter?: string;
  // Stable unique user attribute. Defaults to objectGUID.
  idAttribute?: string;
  nestedGroups?: boolean;
  // LDAP attribute -> Liquio user field.
  attributes?: Record<string, string>;
  linkByEmail?: boolean;
  accessGroups?: string[];
  sync?: {
    isEnabled?: boolean;
    intervalMinutes?: number;
  };
}

export interface OIDCProviderConfig {
  issuer?: string;
  authorizationURL?: string;
  tokenURL?: string;
  userInfoURL?: string;
  endSessionURL?: string;
  clientID?: string;
  clientSecret?: string;
  callbackURL?: string;
  scope?: string;
  isEnabled?: boolean;
  mapping?: Record<string, string>;
  userInfo?: { enabled: boolean };
  usePKCE?: boolean;
  display?: AuthProviderDisplay;
}

export interface Config {
  allowIdentificationTypes?: string[];
  allowEdrpou?: string[];
  allowRnokpp?: string[];
  cors?: {
    allowedOrigins?: string[];
    maxAge?: number;
  };
  db: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    logging?: boolean;
    dialect?: Dialect;
    ssl?: boolean;
    dialectOptions?: any;
  };
  host?: string;
  port?: number;
  modules?: {
    denyToUpdateUserName?: boolean;
    denyToUpdateUserValidParams?: boolean;
    setPhoneOnlyAsNotValid?: boolean;
  };
  notifyServer?: {
    host?: string;
  };
  kindergartens?: {
    url?: string;
    key?: string;
  };
  session?: {
    secret_key?: string[];
  };
  domain?: string;
  // Cookie attributes. `secure` defaults to `auto` (Secure for HTTPS requests), `sameSite` to `lax`.
  cookies?: {
    secure?: boolean | 'auto';
    sameSite?: 'lax' | 'strict' | 'none';
    // Make the `jwt` profile cookie unreadable by JavaScript (default false, front-ends read it).
    profileHttpOnly?: boolean;
  };
  // Express `trust proxy` value: hop count, or IP/CIDR/preset list of known ingress proxies. Unset trusts nothing.
  trustProxy?: number | string | string[];
  // Keep the deprecated GET (query string) variants of the confirmation code routes (IF-05). Default true; false answers 410.
  legacyGetConfirmation?: boolean;
  notify?: {
    url?: string;
    authorization?: string;
  };
  /**
   * Transport security for calls to internal services: notification (`notify.url`, `pingRoutes.notify`)
   * and sign-tool (`x509.externalUrl`).
   */
  internalTransport?: {
    /** Extra CA certificate(s) trusted for https:// internal URLs: PEM string or path to a PEM file. Verification is always on. */
    ca?: string | string[];
    /**
     * Explicit opt-in to plain http:// internal URLs in production (notification and sign-tool do not serve TLS themselves).
     * Compensating control: NetworkPolicies (helm-chart `networkpolicies.yaml`) limit these services to in-cluster Liquio pods.
     * Default false: production refuses to start with an http:// URL.
     */
    allowPlainHttp?: boolean;
  };
  admin_config?: {
    api_url?: string;
    login?: string;
    password?: string;
  };
  jwt?: {
    secret?: string;
    expiresIn?: number | string | null | object | any[];
  };
  // `POST /user/info` options.
  user_info?: {
    // Let a user token set `useTwoFactorAuth` and `twoFactorType` through `POST /user/info` without a proof of the factor (default false).
    // The supported way is `POST /user/two_factor_auth`.
    allowTwoFactorFields?: boolean;
  };
  // Named identities for `basic()` routes (service-to-service). The legacy shared secret keeps all scopes while allowed.
  basic_auth?: {
    allowLegacySharedSecret?: boolean;
    clients?: {
      name: string;
      secret?: string;
      secret_hash?: string;
      scopes?: ('user:read' | 'user:write' | 'user:admin' | 'password:set' | 'totp' | 'login_history' | 'login_history:all' | 'login_history:pii')[];
      // Page size cap for `/login_history` (default 100).
      maxLimit?: number;
    }[];
  };
  // Roles named clients may assign through `PUT /user/info/:id` (`;`-separated values are checked one by one).
  roles?: string[];
  oauth?: {
    accessTokenLifetimeInSeconds?: number;
    refreshTokenLifetimeInSeconds?: number;
    secret_key?: string[];
    // Enforce the explicit consent step for clients with `need_scope_approve` (needs a consent page in id-front). Default false.
    enforceScopeConsent?: boolean;
    defaults?: {
      client_id?: string;
      client_secret?: string;
      redirect_uri?: string[];
      state?: string;
      scope_fields?: string[];
      need_scope_approve?: boolean;
      client_name?: string;
      scope?: string[];
    };
  };
  mail?: {
    gateway?: string;
    from?: string;
  };
  auth_providers: {
    totp?: {
      // Require the end user access token (`?access_token=`) on `/totp/generate|enable|disable` and take `userId` from it.
      requireUserToken?: boolean;
    };
    govid?: {
      timeout?: number;
      authorizationUrl?: string;
      clientId?: string;
      clientSecret?: string;
      redirectUrl?: string;
      useEncryption?: boolean;
      idCert?: string;
      encryptionServiceUrl?: string;
      encryptionServiceToken?: string;
      namesNaList?: string[];
      authType?: string | string[];
    };
    bankid?: {
      authorizationURL?: string;
      tokenURL?: string;
      customerURL?: string;
      clientID?: string;
      clientSecret?: string;
      callbackURL?: string;
      privateKey?: string;
      passReqToCallback?: string;
    };
    local?: {
      isEnabled?: boolean;
      isForgotPasswordEnabled?: boolean;
      resetPasswordUrl?: string;
      resetPasswordSubject?: string;
      resetPasswordBody?: string;
      resetPasswordTokenExpiration?: number;
      display?: AuthProviderDisplay;
    };
    wso2?: {
      isEnabled?: boolean;
      display?: AuthProviderDisplay;
      [key: string]: any;
    };
    x509?: {
      isEnabled?: boolean;
      display?: AuthProviderDisplay;
      /** Require the signed server-issued challenge (`token`) for /authorise/x509. Default true; false re-enables the replayable legacy `{pkcs7}` payload. */
      requireChallenge?: boolean;
    };
    ldap?: LdapProviderConfig;
    oauth2?: StrategyOptions & {
      userProfileUrl: string;
      /** Legacy, default false: send the access token as `?access_token=` instead of the `Authorization: Bearer` header. Leaks the token into URLs/logs; a warning is logged when on. */
      tokenInQuery?: boolean;
    };
    oidc?: {
      [providerId: string]: OIDCProviderConfig;
    };
  };
  passwordManager?: {
    minPasswordLength?: number;
    maxAttempts?: number;
    maxAttemptDelay?: number;
    hashingSaltRounds?: number;
    rememberLastPasswords?: number;
    // Let `POST /user/password/set` take a caller-chosen password. When false, it emails the user a single-use reset link instead. Default true.
    allowAdminSet?: boolean;
  };
  pingRoutes?: {
    notify?: string;
    eds?: string;
  };
  // Limits for the `basic()` user read routes (KS-25), see lib/user_read_policy.ts.
  users?: {
    // Page size cap for `GET /user` and `POST /user/info/search`. Default 100.
    maxLimit?: number;
    // Batch cap for `POST /user/info/{id,ipn,edrpou}`. Default 1000.
    maxBatch?: number;
    // Named basic_auth clients that may receive `services` and run unfiltered lists. The legacy shared secret always may.
    fullReadClients?: string[];
  };
  redis: {
    isEnabled?: boolean;
    host?: string;
    port?: number;
    defaultTtl?: number;
    prefix?: string;
  };
  confirmCodeLength?: number;
  confirmCodeRetries?: number;
  confirmCodeEmailTemplate?: string;
  confirmCodeEmailHeader?: string;
  accountExistsEmailHeader?: string;
  accountExistsEmailText?: string;
  confirmCodeEmailChangeHeader?: string;
  swagger?: boolean;
  customer?: string;
  environment?: string;
  x509?: {
    isEnabled?: boolean;
    externalUrl?: string;
    timeout?: number;
  };
  enabledDeleteUser?: boolean;
  log?: {
    excludeParams?: string[];
    disableDefaultRedaction?: boolean;
  };
  signUp?: {
    isEnabled?: boolean;
  };
  gtm_key?: string;
  separateLegalUsers?: boolean;
  eds?: {
    onlyLegalEntityAllow?: boolean;
    sign_proxy_url?: string;
    sign_proxy_allowed_paths?: string[];
    sign_proxy_allowed_methods?: string[];
    ics_proxy?: {
      enabled?: boolean;
      allowed_paths?: string[];
      timeout?: number;
    };
    unavailableMessage?: string;
    limit?: number;
    timeout?: number;
  };
  encryption?: {
    enabled?: boolean;
    algorithm?: string;
    securityKey?: string;
    iv?: string;
  };
  edsServer?: {
    host?: string;
    acskListUrl?: string;
    signVerifyUrl?: string;
  };
  testConfirmations?: {
    codes?: string[];
  };
  versions?: {
    services: {
      name: string;
      minVersion: string;
    }[];
  };
  confirmCode?: {
    ttlMinutes?: number;
    // Limits for sending confirmation codes (defaults: DEFAULT_SEND_LIMIT).
    sendLimit?: {
      recipientMax?: number;
      recipientWindowSeconds?: number;
      sourceMax?: number;
      sourceWindowSeconds?: number;
      // Separate limits for 2FA phone code sends (same fields).
      twoFactor?: {
        recipientMax?: number;
        recipientWindowSeconds?: number;
        sourceMax?: number;
        sourceWindowSeconds?: number;
      };
    };
  };
}

const CONFIG_PATH = process.env.CONFIG_PATH || process.cwd() + '/config';
const SECRET_PATH = process.env.SECRET_PATH;

let config: Config;
export function loadConfig(): Config {
  if (config) {
    return config;
  }

  const envConfigVar = process.env['LIQUIO_ID_CONFIG'];
  const env = process.env.NODE_ENV ?? 'localhost';

  if (typeof envConfigVar === 'string') {
    let parsedEnvConfig;
    try {
      parsedEnvConfig = JSON.parse(envConfigVar);
    } catch (error) {
      throw new Error(`LIQUIO_ID_CONFIG is invalid json: ${error}`);
    }
    if (typeof parsedEnvConfig[env] === 'undefined') {
      throw new Error(`LIQUIO_ID_CONFIG [${env}] is not defined object config.`);
    }
    config = ConfigLoader.fromObject<Config>(parsedEnvConfig[env], { schema: buildIdApiConfigSchema(env) }).toObject();
    return config;
  }

  const raw = ConfigLoader.load<Record<string, any>>({
    configPath: CONFIG_PATH,
    secretPath: SECRET_PATH ?? null,
    envPrefix: 'LIQUIO_CFG_ID_',
  }).toObject();

  const configData = raw.config;
  const resolvedEnv = env !== 'localhost' ? env : (configData?.default_env ?? 'localhost');
  const envConf = configData?.[resolvedEnv];

  if (!envConf) {
    throw new Error(`Config for env [${resolvedEnv}] is not defined or missing 'db' section.`);
  }

  const merged = {
    ...envConf,
    ...(raw.versions?.versions !== undefined ? { versions: raw.versions.versions } : {}),
  };
  config = ConfigLoader.fromObject<Config>(merged, { schema: buildIdApiConfigSchema(resolvedEnv) }).toObject();

  return config;
}
