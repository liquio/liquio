import type { SandboxConfig } from '@liquio/back-core';

/** Numeric option that may also be provided as a string (env override). */
type NumberLike = number | string;

/** Log config section. */
export interface PersistLinkLogConfig {
  console?: { name?: string } | unknown[];
  file?: unknown[];
  responsesData?: boolean;
  stackTrace?: boolean;
  excludeParams?: string[];
  disableDefaultRedaction?: boolean;
  [key: string]: unknown;
}

/** Auth config section. */
export interface PersistLinkAuthConfig {
  tokens?: string[];
  defaultUnits?: Array<number | string>;
  [key: string]: unknown;
}

/** File converter config section. */
export interface PersistLinkFileConverterConfig {
  isEnabled?: boolean;
  url?: string;
  token?: string;
  timeout?: NumberLike;
  routes?: Record<string, string>;
  [key: string]: unknown;
}

/** Link generator config section. */
export interface PersistLinkLinkGeneratorConfig {
  secretKey?: string;
  cryptIv?: string;
  linksPrefix?: string;
  smallHashRandomBytesLength?: NumberLike;
  [key: string]: unknown;
}

/** Link providers config section. */
export interface PersistLinkLinkProvidersConfig {
  simple?: Record<string, unknown>;
  filestorage?: {
    serversList?: unknown[];
    addContentDispositionHeader?: boolean;
    inlineContentTypes?: string[];
    [key: string]: unknown;
  };
  external?: Record<string, unknown>;
  [key: string]: unknown;
}

/** PDF generator config section. */
export interface PersistLinkPdfGeneratorConfig {
  url?: string;
  basicAuthToken?: string;
  requestTimeout?: NumberLike;
  [key: string]: unknown;
}

/** Server config section. */
export interface PersistLinkServerConfig {
  hostname?: string;
  port?: NumberLike;
  maxBodySize?: NumberLike;
  [key: string]: unknown;
}

/** Versions config section. */
export interface PersistLinkVersionsConfig {
  customer?: NumberLike;
  environment?: NumberLike;
  [key: string]: unknown;
}

/** Persist-link application config. */
export interface PersistLinkConfig {
  auth?: PersistLinkAuthConfig;
  db: Record<string, any>;
  file_converter?: PersistLinkFileConverterConfig;
  link_generator?: PersistLinkLinkGeneratorConfig;
  link_providers?: PersistLinkLinkProvidersConfig;
  log?: PersistLinkLogConfig;
  pdf_generator?: PersistLinkPdfGeneratorConfig;
  sandbox?: Partial<SandboxConfig>;
  server: PersistLinkServerConfig;
  versions?: PersistLinkVersionsConfig;
  [key: string]: unknown;
}
