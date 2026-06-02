import fs from 'fs';
import Multiconf from 'multiconf';
import { StrategyOptions } from 'passport-oauth2';
import { Dialect } from 'sequelize';

export const DEFAULT_COOKIE_DOMAIN = '.liquio';
export const DEFAULT_CODE_RETRIES = 5;
export const DEFAULT_CODE_LENGTH = 6;

/**
 * OIDC Provider Configuration
 */
export interface OIDCProviderConfig {
  name: string;
  isEnabled?: boolean;
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  issuer?: string;
  authorizationURL?: string;
  tokenURL?: string;
  userInfoURL?: string;
  scope?: string;
  usePKCE?: boolean;
  userInfo?: {
    enabled?: boolean;
  };
  mapping?: Record<string, string>;
}

/**
 * OIDC Configuration containing array of providers
 */
export interface OIDCConfig {
  providers?: OIDCProviderConfig[];
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
    logging: boolean;
    dialect: Dialect;
    ssl?: boolean;
    dialectOptions?: any;
  };
  host?: string;
  port: number;
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
  notify?: {
    url?: string;
    authorization?: string;
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
  oauth?: {
    accessTokenLifetimeInSeconds?: number;
    refreshTokenLifetimeInSeconds?: number;
    secret_key?: string[];
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
    eds?: {
      authorizationURL?: string;
      tokenURL?: string;
      customerURL?: string;
      clientID?: string;
      clientSecret?: string;
      callbackURL?: string;
      passReqToCallback?: string;
      caServerList?: string;
      blacklistAcsk?: string[];
    };
    local?: {
      isEnabled?: boolean;
      isForgotPasswordEnabled?: boolean;
    };
    oidc?: OIDCConfig;
    wso2?: any;
    x509?: {
      isEnabled?: boolean;
    };
    oauth2?: StrategyOptions & { userProfileUrl: string };
  };
  passwordManager?: {
    minPasswordLength?: number;
    maxAttempts?: number;
    maxAttemptDelay?: number;
    hashingSaltRounds?: number;
    rememberLastPasswords?: number;
  };
  pingRoutes?: {
    notify?: string;
    eds?: string;
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
  ldap?: {
    isEnabled?: boolean;
    isRequired?: boolean;
    url?: string;
    baseDN?: string;
    username?: string;
    password?: string;
  };
  log?: {
    excludeParams?: string[];
  };
  signUp?: {
    isEnabled?: boolean;
  };
  gtm_key?: string;
  separateLegalUsers?: boolean;
  eds?: {
    onlyLegalEntityAllow?: boolean;
    sign_proxy_url?: string;
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
  versions: {
    services: {
      name: string;
      minVersion: string;
    }[];
  };
  confirmCode?: {
    ttlMinutes: number;
  };
}

const CONFIG_PATH = process.env.CONFIG_PATH || process.cwd() + '/config';
const SECRET_PATH = process.env.SECRET_PATH;

/**
 * Validates OIDC provider configuration
 * Throws an error if required fields are missing or invalid
 */
function validateOIDCConfig(config: Config): void {
  if (!config.auth_providers?.oidc?.providers) {
    return; // No OIDC providers configured
  }

  const providers = config.auth_providers.oidc.providers;

  for (const provider of providers) {
    // Skip validation if provider is explicitly disabled
    if (provider.isEnabled === false) {
      continue;
    }

    // Validate required fields for enabled providers
    const errors: string[] = [];

    if (!provider.name) {
      errors.push('name is required');
    }
    if (!provider.clientID) {
      errors.push('clientID is required');
    }
    if (!provider.clientSecret) {
      errors.push('clientSecret is required');
    }
    if (!provider.callbackURL) {
      errors.push('callbackURL is required');
    }

    // Validate issuer or endpoint overrides
    const hasIssuer = !!provider.issuer;
    const hasAllEndpoints = !!provider.authorizationURL && !!provider.tokenURL && !!provider.userInfoURL;

    if (!hasIssuer && !hasAllEndpoints) {
      errors.push('must have either "issuer" or all of "authorizationURL", "tokenURL", "userInfoURL"');
    }

    if (errors.length > 0) {
      const providerName = provider.name || 'unknown';
      throw new Error(`Invalid OIDC provider config [${providerName}]: ${errors.join('; ')}`);
    }
  }
}

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
    config = parsedEnvConfig[env] as Config;
    validateOIDCConfig(config);
    return config;
  }

  const paths = [CONFIG_PATH, ...(SECRET_PATH && fs.existsSync(SECRET_PATH) ? [SECRET_PATH] : [])];
  const raw = Multiconf.get(paths, 'LIQUIO_CFG_ID_') as any;

  const configData = raw.config;
  const resolvedEnv = env !== 'localhost' ? env : (configData?.default_env ?? 'localhost');
  const envConf = configData?.[resolvedEnv];

  if (!envConf || !envConf.db) {
    throw new Error(`Config for env [${resolvedEnv}] is not defined or missing 'db' section.`);
  }

  config = {
    ...envConf,
    ...(raw.versions?.versions !== undefined ? { versions: raw.versions.versions } : {}),
  } as Config;

  validateOIDCConfig(config);

  return config;
}
