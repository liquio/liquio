import type { Readable } from 'node:stream';

/** Logger used by the register-api client. */
export interface RegisterApiLog {
  save(event: string, data?: any, level?: 'info' | 'warn' | 'warning' | 'error'): void;
}

/** Register routes. `:id` is replaced with the encoded path parameter. */
export interface RegisterApiRoutes {
  getRegisters: string;
  findRegisterById: string;
  createRegister: string;
  updateRegisterById: string;
  deleteRegisterById: string;
  exportRegister: string;
  importRegister: string;
  streamExportRegister: string;
  streamImportRegister: string;
  getKeys: string;
  findKeyById: string;
  getSyncedKeys: string;
  getAllSyncedKeys: string;
  createKey: string;
  updateKeyById: string;
  deleteKeyById: string;
  updateKeyIndexMapping: string;
  reindexKey: string;
  afterHandlersReindexKey: string;
  getKeyHistory: string;
  getRecords: string;
  getRecordsByPost: string;
  getFilteredRecords: string;
  searchRecords: string;
  findRecordById: string;
  createRecord: string;
  updateRecordById: string;
  deleteRecordById: string;
  importBulkRecords: string;
  deleteBulkRecords: string;
  getRecordHistory: string;
  getAccessLog: string;
  startRollback: string;
  getRollbackStatus: string;
  rollbackRecord: string;
  ping: string;
  pingWithAuth: string;
}

/** Register-api client config. */
export interface RegisterApiConfig {
  /** Full base URL with protocol (and port). Wins over `server`/`port`. */
  url?: string;
  /** Register server with protocol. Default: `http://register` when `url` is not set. */
  server?: string;
  /** Register port. Default: `8080` only when neither `url` nor `server` is set. */
  port?: number | string;
  /** Value of the `token` request header. No header when not set. */
  token?: string;
  /** Request timeout in ms. Default: `30000`. `0` disables it. */
  timeout?: number;
  /** Route overrides. */
  routes?: Partial<RegisterApiRoutes>;
  /** Returns the logger. Default: `global.log` when present, otherwise logging is skipped. */
  getLog?: () => RegisterApiLog | undefined;
}

/** Access info sent in the `access-info` header (base64 JSON). */
export interface RegisterApiAccessInfo {
  systemId?: string;
  userId?: string;
  userName?: string;
  orgName?: string;
  position?: string;
  remarks?: string;
  workflowId?: string;
  requestAt?: string;
  [key: string]: unknown;
}

/** Person that performs an action. */
export interface RegisterApiPerson {
  id: string;
  name: string;
}

/** Per-call options. */
export interface RegisterApiCallOptions {
  accessInfo?: RegisterApiAccessInfo;
  /** Timeout in ms for this call. `0` disables it. */
  timeout?: number;
}

export interface RegisterApiDeleteRecordOptions extends RegisterApiCallOptions {
  person?: RegisterApiPerson;
  body?: unknown;
}

export type RegisterApiQueryValue = string | number | boolean | null | undefined | Record<string, unknown> | unknown[];
export type RegisterApiQuery = Record<string, RegisterApiQueryValue>;

export interface RegisterApiRegister {
  id?: number | string;
  name?: string;
  description?: string;
  schema?: any;
  [key: string]: unknown;
}

export interface RegisterApiKey {
  id?: number | string;
  name?: string;
  description?: string;
  registerId?: number | string;
  schema?: any;
  [key: string]: unknown;
}

export interface RegisterApiRecord {
  id?: string;
  registerId?: number | string;
  keyId?: number | string;
  data?: any;
  meta?: any;
  allowTokens?: string[];
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface RegisterApiHistoryEntry {
  id?: number | string;
  [key: string]: unknown;
}

export interface RegisterApiAccessLogEntry {
  id?: number | string;
  [key: string]: unknown;
}

export interface RegisterApiListMeta {
  count?: number;
  offset?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface RegisterApiListResponse<T> {
  data: T[];
  meta?: RegisterApiListMeta;
  [key: string]: unknown;
}

export interface RegisterApiExportOptions {
  withData?: boolean;
  keyIds?: Array<number | string> | string;
}

export interface RegisterApiImportOptions {
  force?: boolean;
  rewriteSchema?: boolean;
  clearRecords?: boolean;
  addData?: boolean;
}

export interface RegisterApiStreamExportOptions {
  withData?: boolean;
  file?: boolean;
}

export interface RegisterApiSearchOptions {
  keyId: number | string;
  text: string;
  limit?: number;
  offset?: number;
}

export interface RegisterApiImportBulkRecordsOptions {
  registerId: number | string;
  keyId: number | string;
  records: unknown[];
  background?: boolean;
  isCalculateSearchStrings?: boolean;
  isReturnCreatedRecords?: boolean;
}

export interface RegisterApiDeleteBulkRecordsOptions {
  registerId: number | string;
  keyId: number | string;
  skipRecordIds?: string[];
}

export interface RegisterApiStartRollbackOptions {
  keyId: number | string;
  timePoint: string;
}

export interface RegisterApiRollbackRecordOptions {
  historyId: number | string;
  recordId: string;
  keyId: number | string;
}

export interface RegisterApiPingOptions {
  withAuth?: boolean;
}

export interface RegisterApiStreamResult {
  status: number;
  headers: Record<string, string>;
  stream: Readable;
}

export interface RegisterApiPingResult {
  version?: string;
  customer?: string;
  environment?: string;
  body: any;
}

export interface RegisterApiHttpResult {
  status: number;
  headers: Record<string, string>;
  body: any;
}
