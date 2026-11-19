/** Id-api client settings. */
export interface CabinetApiLiquioIdConfig {
  server?: string;
  port?: number | string;
  routes?: Record<string, string>;
  timeout?: number | string;
  clientId?: string;
  clientSecret?: string;
  basicAuthToken?: string;
  [key: string]: any;
}

/** Auth settings. */
export interface CabinetApiAuthConfig {
  LiquioId: CabinetApiLiquioIdConfig;
  authRedirectUrl?: string;
  logoutRedirectUrl?: string;
  jwtSecret?: string;
  ttlSeconds?: number | string;
  jwtOnlyFreshnessSeconds?: number | string;
  allowedTestAuth?: boolean;
  allowedTestSign?: boolean;
  allowedTestPem?: boolean;
  defaultUnits?: any[];
  doNotLogoutOtherSessions?: boolean;
  caching?: {
    isEnabled?: boolean;
    getCheckMiddleware?: {
      isEnabled?: boolean;
      ttl?: number | string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  [key: string]: any;
}

/** Log settings. The `console` section ships as an empty array in the template. */
export interface CabinetApiLogConfig {
  console: { name?: string; [key: string]: any } | unknown[];
  file?: unknown;
  excludeParams?: string[];
  disableDefaultRedaction?: boolean;
  [key: string]: any;
}

/** HTTP server settings. */
export interface CabinetApiServerConfig {
  hostname?: string;
  port?: number | string;
  maxBodySize?: number | string;
  swagger?: boolean;
  customer?: string;
  environment?: string;
  [key: string]: any;
}

/** Custom API proxy entry. */
export interface CabinetApiCustomApiConfig {
  apiName?: string;
  proxyTo?: string;
  authHeader?: string;
  sendUserData?: boolean;
  isCheckJwtOnly?: boolean;
  headers?: Record<string, any>;
  allowedUnits?: any[];
  allowedPaths?: any[];
  [key: string]: any;
}

/** Proxy discovery settings. */
export interface CabinetApiDiscoveryConfig {
  mainProxy?: string;
  mainProxyDenyPaths?: any[];
  mainProxyAllowPaths?: any[];
  customApis?: CabinetApiCustomApiConfig[];
  [key: string]: any;
}

/** Redis settings. */
export interface CabinetApiRedisConfig {
  isEnabled?: boolean;
  host?: string;
  port?: number | string;
  defaultTtl?: number | string;
  [key: string]: any;
}

/** Cabinet-api config. */
export interface CabinetApiConfig {
  auth: CabinetApiAuthConfig;
  db: Record<string, any>;
  discovery: CabinetApiDiscoveryConfig;
  log: CabinetApiLogConfig;
  redis?: CabinetApiRedisConfig;
  server: CabinetApiServerConfig;
  [key: string]: any;
}
