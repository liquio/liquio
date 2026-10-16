import { existsSync } from 'fs';

import Multiconf from 'multiconf';
import { SandboxConfig } from '@liquio/back-core';

import type { TlsConfig } from './tls';

export const CONFIG_PATH = process.env.CONFIG_PATH || '../config/register';
export const SECRET_PATH = process.env.SECRET_PATH;
export const LIQUIO_CONFIG_PREFIX = process.env.LIQUIO_CONFIG_PREFIX || 'LIQUIO_CFG_REGISTER';

export const config: Config = Multiconf.get(
  [CONFIG_PATH, ...(SECRET_PATH && existsSync(SECRET_PATH) ? [SECRET_PATH] : [])],
  `${LIQUIO_CONFIG_PREFIX}_`,
) as unknown as Config;

export interface Config {
  access_log: { keyIds: string[] };
  admin: { swagger: boolean };
  afterhandler: {
    options: { reindexLimit: number };
    blockchain: any;
    elastic: any;
  };
  app: { processTitle: string };
  auth: {
    tokens: string[];
    allowRawSequelizeParamsUsers: string[];
    /** Basic users allowed to send `allow_see_all_records`, `disable_fields_rules` and `allow_tokens`. Empty/missing: all ignored. */
    trustedCallers?: string[];
    /** Server-side allow tokens per verified Basic user (used for callers that are not trusted). */
    userAllowTokens?: Record<string, string[]>;
    limitedAccess: Array<{ user: string; keys: string[] }>;
    /** Opt-in per-user allow-list (`routes`, `keys`). Users without an entry keep full access. */
    servicePermissions?: Record<string, { routes?: string[]; keys?: Array<number | string> }>;
    /** Opt-in: destructive routes (rollback, deletes) require `trustedCallers`. Default off. */
    strict?: boolean;
  };
  db: {
    database: string;
    host: string;
    port: number;
    dialect: string;
    username: string;
    password: string;
    operatorsAliases: boolean;
    dialectOptions: {
      socketPath: string;
      supportBigNumbers: boolean;
      bigNumberStrings: boolean;
    };
    pool: {
      max: number;
      min: number;
      acquire: number;
      idle: number;
    };
    logging: boolean;
    migrationStorageTableName: string;
  };
  encryption: {
    key: string;
    iv_size: number;
    batch_job_size: number;
  };
  filters: {
    wrongValues: string[];
  };
  key_signature: {
    [key: string]: { validationIdentity: string[] };
  };
  log: {
    console: any[];
    responsesData: boolean;
    excludeParams: string[];
  };
  pagination: {
    maxLimit: number;
    maxExportLimit: number;
    /** Ceiling for `no_limit` CSV exports; defaults to `maxExportLimit`. */
    maxCsvExportRecords?: number;
    packetLimit: number;
  };
  redis: {
    isEnabled: boolean;
    host: string;
    port: number;
    defaultTtl: number;
  };
  sandbox?: SandboxConfig;
  search: {
    [key: string]: {
      /** Data path used when the request has no `search_key` (instead of the derived `search_string`). */
      defaultSearchKey?: string;
      resultsCount: number;
      doNotSearchThisWords: string[];
      replaceWords: Array<{ from: string; to: string }>;
    };
  };
  server: {
    hostname: string;
    port: number;
    /** JSON body limit for ordinary routes. */
    maxBodySize: string;
    /** JSON body limit for authenticated bulk/import routes; defaults to `maxBodySize`. */
    maxBulkBodySize?: string;
    requestTimeout?: number;
    headersTimeout?: number;
    customer: string;
    environment: string;
  };
  sign: {
    timeout: number;
    url: string;
    token: string;
    tls?: TlsConfig;
    allowPlainHttp?: boolean;
  };
}
