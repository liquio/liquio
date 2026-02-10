import fs from 'fs';
import { StrategyOptions } from 'passport-oauth2';
import { Dialect } from 'sequelize';

export const DEFAULT_COOKIE_DOMAIN = '.liquio';
export const DEFAULT_CODE_RETRIES = 5;
export const DEFAULT_CODE_LENGTH = 6;

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
    linkedin?: {
      consumerKey?: string;
      consumerSecret?: string;
      callbackURL?: string;
      passReqToCallback?: string;
      profileFields?: string[];
    };
    twitter?: {
      consumerKey?: string;
      consumerSecret?: string;
      callbackURL?: string;
      passReqToCallback?: string;
    };
    google?: {
      clientID?: string;
      clientSecret?: string;
      callbackURL?: string;
      passReqToCallback?: string;
    };
    facebook?: {
      clientID?: string;
      clientSecret?: string;
      callbackURL?: string;
      passReqToCallback?: string;
      profileFields?: string[];
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
    diia?: {
      publicKey?: string;
      privateKey?: string;
      internalPrivateKey?: string;
      audience?: string | string[];
      namesNaList?: string[];
    };
    local?: {
      isEnabled?: boolean;
      isForgotPasswordEnabled?: boolean;
    };
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

let config: Config;
export function loadConfig(): Config {
  if (config) {
    return config;
  }

  const nconf = require('nconf');

  const file = process.env.CONFIG_PATH ? `${process.env.CONFIG_PATH}/config.json` : process.cwd() + '/config/config.json';
  if (!fs.existsSync(file) && !process.env['LIQUIO_ID_CONFIG']) {
    throw new Error(`Unable to load config: neither ${file} exists, nor LIQUIO_ID_CONFIG variable is set.`);
  }

  // Init config file.
  const fileConfig = nconf.env().file({ file });

  // Init config versions.
  const versionsFile = process.env.CONFIG_PATH ? `${process.env.CONFIG_PATH}/versions.json` : process.cwd() + '/config/versions.json.default';
  const versionsConfText = fs.readFileSync(versionsFile, 'utf8');
  const versionsConf = JSON.parse(versionsConfText || '{}');

  const env = process.env.NODE_ENV ?? fileConfig.get('default_env') ?? 'localhost';
  let envConfig = process.env['LIQUIO_ID_CONFIG'];
  if (typeof env !== 'string' || !env) {
    throw new Error(`ENV [${env}] is not defined.`);
  }

  let currentEnvConf = fileConfig.get(env);
  if (typeof envConfig === 'string') {
    let parsedEnvConfig;
    try {
      parsedEnvConfig = JSON.parse(envConfig);
    } catch (error) {
      throw new Error(`LIQUIO_ID_CONFIG is invalid json: ${error}`);
    }

    if (typeof parsedEnvConfig[env] === 'undefined') {
      throw new Error(`LIQUIO_ID_CONFIG [${env}] is not defined object config.`);
    }

    currentEnvConf = parsedEnvConfig[env];
  }

  if (typeof currentEnvConf === 'undefined' || typeof currentEnvConf.db === 'undefined') {
    throw new Error('Variable currentEnvConf.db is not defined.');
  }

  config = {
    ...currentEnvConf,
    ...versionsConf,
  };

  return config;
}
