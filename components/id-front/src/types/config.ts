/**
 * Runtime configuration, loaded from `/config.json` and merged over the defaults
 * passed to `loadConfig` (see `src/index.js`). Known fields are typed; anything a
 * deployment adds on top stays `unknown` until a consumer needs it.
 */
export interface ApplicationConfig {
  [key: string]: unknown;
}

/** Date formats read by `helpers/humanDateFormat`. */
export interface VariablesConfig {
  dateFormat?: string;
  dateTimeFormat?: string;
  [key: string]: unknown;
}

/** `WSO2.redirect` makes the app navigate to the WSO2 login right after the auth check. */
export interface Wso2Config {
  redirect?: unknown;
  [key: string]: unknown;
}

/** Certificate options read by the Login page. */
export interface EdsConfig {
  useEncodeCert?: unknown;
  allowLoginWithoutEncodeCert?: unknown;
  [key: string]: unknown;
}

export interface ConfigDefaults {
  APP_NAME?: string;
  APP_TITLE?: string;
  APP_ENV?: string;
  BACKEND_URL?: string;
  BUILD_ID?: string;
  ONLINE_HELP?: boolean;
  SHOW_PHONE?: boolean;
  SHOW_PHONE_CONFIRM?: boolean;
  FORCE_REGISTER?: boolean;
  defaultLanguage?: string;
  application?: ApplicationConfig;
  variables?: VariablesConfig;
  WSO2?: Wso2Config;
  eds?: EdsConfig;
  [key: string]: unknown;
}

/** The merged config returned by `loadConfig` / `getConfig`: `application` is always an object. */
export interface RuntimeConfig extends ConfigDefaults {
  application: ApplicationConfig;
}
